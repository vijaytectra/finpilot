"""Core domain tables. Natural business keys (C0001, A00001, I0001, ...) are the primary keys:
they are stable, immutable identifiers supplied by the upstream system, so a surrogate id
would only add a translation step to every join and import."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Computed,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Sequence,
    SmallInteger,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Money, Price, TimestampMixin, Units, in_check
from app.models.enums import (
    AccountStatus,
    AccountType,
    AssetClass,
    Band,
    Exchange,
    GoalType,
    KycStatus,
    RiskLevel,
    Role,
    Segment,
    TransactionStatus,
    TransactionType,
    values,
)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(in_check("role", values(Role)), name="role_valid"),
        CheckConstraint("email = lower(email)", name="email_lowercase"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(10))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(server_default=text("true"))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint(r"customer_id ~ '^C[0-9]{4,}$'", name="id_format"),
        CheckConstraint(in_check("kyc_status", values(KycStatus)), name="kyc_status_valid"),
        CheckConstraint(in_check("segment", values(Segment)), name="segment_valid"),
        CheckConstraint("onboarded_at > date_of_birth", name="onboarded_after_birth"),
        CheckConstraint("email = lower(email)", name="email_lowercase"),
        Index(
            "ix_customers_search_trgm",
            "search_text",
            postgresql_using="gin",
            postgresql_ops={"search_text": "gin_trgm_ops"},
        ),
    )

    customer_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    phone: Mapped[str] = mapped_column(String(20))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(3))
    date_of_birth: Mapped[date] = mapped_column(Date)
    onboarded_at: Mapped[date] = mapped_column(Date)
    kyc_status: Mapped[str] = mapped_column(String(10))
    segment: Mapped[str] = mapped_column(String(10))
    # Single lower-cased haystack for "search by id, name, email or city", backed by a
    # pg_trgm GIN index so `ILIKE '%term%'` does not degrade into a sequential scan.
    search_text: Mapped[str] = mapped_column(
        Text,
        Computed(
            "lower(customer_id || ' ' || full_name || ' ' || email || ' ' || city)",
            persisted=True,
        ),
    )

    accounts: Mapped[list["Account"]] = relationship(back_populates="customer")


class Account(TimestampMixin, Base):
    __tablename__ = "accounts"
    __table_args__ = (
        CheckConstraint(r"account_id ~ '^A[0-9]{5,}$'", name="id_format"),
        CheckConstraint(in_check("account_type", values(AccountType)), name="type_valid"),
        CheckConstraint(in_check("status", values(AccountStatus)), name="status_valid"),
        CheckConstraint(r"base_currency ~ '^[A-Z]{3}$'", name="currency_iso"),
        Index(None, "customer_id"),
    )

    account_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="RESTRICT")
    )
    account_type: Mapped[str] = mapped_column(String(20))
    provider: Mapped[str] = mapped_column(String(80))
    opened_at: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(10))
    base_currency: Mapped[str] = mapped_column(String(3))

    customer: Mapped[Customer] = relationship(back_populates="accounts")


class Instrument(TimestampMixin, Base):
    __tablename__ = "instruments"
    __table_args__ = (
        CheckConstraint(r"instrument_id ~ '^I[0-9]{4,}$'", name="id_format"),
        CheckConstraint(in_check("asset_class", values(AssetClass)), name="asset_class_valid"),
        CheckConstraint(in_check("exchange", values(Exchange)), name="exchange_valid"),
        CheckConstraint(in_check("risk_band", values(Band)), name="risk_band_valid"),
        CheckConstraint("last_price > 0", name="price_positive"),
        CheckConstraint(r"currency ~ '^[A-Z]{3}$'", name="currency_iso"),
        # Data dictionary: sector is populated for equities and blank otherwise.
        CheckConstraint(
            "(asset_class = 'EQUITY') = (sector IS NOT NULL)", name="sector_only_for_equity"
        ),
    )

    instrument_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), unique=True)
    instrument_name: Mapped[str] = mapped_column(String(120))
    asset_class: Mapped[str] = mapped_column(String(20))
    sector: Mapped[str | None] = mapped_column(String(40))
    exchange: Mapped[str] = mapped_column(String(10))
    currency: Mapped[str] = mapped_column(String(3))
    last_price: Mapped[Price]
    price_as_of: Mapped[date] = mapped_column(Date)
    risk_band: Mapped[str] = mapped_column(String(10))


class RiskProfile(TimestampMixin, Base):
    """Keyed by (customer, assessed_at) so re-assessments keep history; the latest one is
    exposed through the v_latest_risk_profile view."""

    __tablename__ = "risk_profiles"
    __table_args__ = (
        CheckConstraint("risk_score BETWEEN 0 AND 100", name="score_range"),
        CheckConstraint(in_check("risk_level", values(RiskLevel)), name="level_valid"),
        CheckConstraint(in_check("liquidity_need", values(Band)), name="liquidity_valid"),
        CheckConstraint("horizon_years BETWEEN 0 AND 100", name="horizon_range"),
    )

    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="CASCADE"), primary_key=True
    )
    assessed_at: Mapped[date] = mapped_column(Date, primary_key=True)
    risk_score: Mapped[int] = mapped_column(SmallInteger)
    risk_level: Mapped[str] = mapped_column(String(20))
    horizon_years: Mapped[int] = mapped_column(SmallInteger)
    liquidity_need: Mapped[str] = mapped_column(String(10))


class Holding(TimestampMixin, Base):
    """End-of-day position snapshot. The composite PK makes a duplicate position for the same
    account/instrument/date impossible, so the importer must de-duplicate explicitly."""

    __tablename__ = "holdings_snapshot"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("avg_cost >= 0", name="avg_cost_non_negative"),
        Index(None, "instrument_id"),
    )

    snapshot_date: Mapped[date] = mapped_column(Date, primary_key=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.account_id", ondelete="RESTRICT"), primary_key=True
    )
    instrument_id: Mapped[str] = mapped_column(
        ForeignKey("instruments.instrument_id", ondelete="RESTRICT"), primary_key=True
    )
    quantity: Mapped[Units]
    avg_cost: Mapped[Price]


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(r"transaction_id ~ '^T[0-9]{7,}$'", name="id_format"),
        CheckConstraint(in_check("transaction_type", values(TransactionType)), name="type_valid"),
        CheckConstraint(in_check("status", values(TransactionStatus)), name="status_valid"),
        CheckConstraint("amount >= 0", name="amount_non_negative"),
        CheckConstraint(
            "(transaction_type IN ('BUY','SELL') AND quantity > 0 AND price > 0)"
            " OR (transaction_type IN ('DIVIDEND','FEE') AND quantity = 0 AND price = 0)",
            name="trade_vs_cash_shape",
        ),
        # Serves the customer transaction list: account filter + newest-first keyset order.
        Index(
            "ix_transactions_account_date",
            "account_id",
            text("trade_date DESC"),
            text("transaction_id DESC"),
        ),
        Index(None, "trade_date"),
        Index(None, "instrument_id"),
    )

    transaction_id: Mapped[str] = mapped_column(String(12), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.account_id", ondelete="RESTRICT"))
    instrument_id: Mapped[str] = mapped_column(
        ForeignKey("instruments.instrument_id", ondelete="RESTRICT")
    )
    transaction_type: Mapped[str] = mapped_column(String(10))
    trade_date: Mapped[date] = mapped_column(Date)
    quantity: Mapped[Units]
    price: Mapped[Price]
    amount: Mapped[Money]
    status: Mapped[str] = mapped_column(String(10))
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("import_batches.id", ondelete="SET NULL")
    )


goal_id_seq = Sequence("goal_id_seq", start=1, metadata=Base.metadata)


class Goal(TimestampMixin, Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint(r"goal_id ~ '^G[0-9]{5,}$'", name="id_format"),
        CheckConstraint(in_check("goal_type", values(GoalType)), name="type_valid"),
        CheckConstraint(in_check("priority", values(Band)), name="priority_valid"),
        CheckConstraint("target_amount > 0", name="target_positive"),
        CheckConstraint("current_funded_amount >= 0", name="funded_non_negative"),
        # Over-funding is not forbidden at the DB level: it can legitimately arrive from an
        # upstream feed and must then be *flagged*, not lost. The API refuses to create it.
        Index(None, "customer_id"),
    )

    goal_id: Mapped[str] = mapped_column(
        String(12),
        primary_key=True,
        server_default=text("'G' || lpad(nextval('goal_id_seq')::text, 5, '0')"),
    )
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="CASCADE")
    )
    goal_type: Mapped[str] = mapped_column(String(20))
    goal_name: Mapped[str] = mapped_column(String(120))
    target_amount: Mapped[Money]
    current_funded_amount: Mapped[Money]
    target_date: Mapped[date] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(10))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


__all__ = [
    "Account",
    "Customer",
    "Goal",
    "Holding",
    "Instrument",
    "RiskProfile",
    "Transaction",
    "User",
    "goal_id_seq",
]
