"""Row contracts for the reference CSVs (data_dictionary.csv). Each model validates types,
vocabularies and single-row business rules; cross-row and cross-table rules (duplicates,
foreign keys) are applied by the loader."""

from datetime import date
from decimal import Decimal
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.models.enums import (
    AccountStatus,
    AccountType,
    AssetClass,
    Band,
    Exchange,
    GoalType,
    KycStatus,
    RiskLevel,
    Segment,
)

CustomerId = Annotated[str, StringConstraints(pattern=r"^C\d{4,}$")]
AccountId = Annotated[str, StringConstraints(pattern=r"^A\d{5,}$")]
InstrumentId = Annotated[str, StringConstraints(pattern=r"^I\d{4,}$")]
GoalId = Annotated[str, StringConstraints(pattern=r"^G\d{5,}$")]
Currency = Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]
Name = Annotated[str, StringConstraints(min_length=1, max_length=120)]
# Deliberately a format check, not deliverability: the dataset uses the reserved .test TLD,
# which strict validators (email-validator) reject by design.
Email = Annotated[
    str, StringConstraints(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254, to_lower=True)
]
PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=18, decimal_places=2)]
NonNegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=18, decimal_places=2)]


class _Row(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)


class CustomerRow(_Row):
    customer_id: CustomerId
    full_name: Name
    email: Email
    phone: Annotated[str, StringConstraints(pattern=r"^\+91\d{10}$")]
    city: Name
    state: Annotated[str, StringConstraints(pattern=r"^[A-Z]{2,3}$")]
    date_of_birth: date
    onboarded_at: date
    kyc_status: KycStatus
    segment: Segment

    @model_validator(mode="after")
    def _dates(self) -> Self:
        if self.onboarded_at <= self.date_of_birth:
            raise ValueError("onboarded_at must be after date_of_birth")
        return self


class AccountRow(_Row):
    account_id: AccountId
    customer_id: CustomerId
    account_type: AccountType
    provider: Name
    opened_at: date
    status: AccountStatus
    base_currency: Currency


class InstrumentRow(_Row):
    instrument_id: InstrumentId
    symbol: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    instrument_name: Name
    asset_class: AssetClass
    sector: Annotated[str, StringConstraints(max_length=40)] | None = None
    exchange: Exchange
    currency: Currency
    last_price: Annotated[Decimal, Field(gt=0, max_digits=18, decimal_places=4)]
    price_as_of: date
    risk_band: Band

    @model_validator(mode="after")
    def _sector(self) -> Self:
        if (self.asset_class is AssetClass.EQUITY) != (self.sector is not None):
            raise ValueError("sector is required for EQUITY and must be blank otherwise")
        return self


class RiskProfileRow(_Row):
    customer_id: CustomerId
    risk_score: Annotated[int, Field(ge=0, le=100)]
    risk_level: RiskLevel
    assessed_at: date
    horizon_years: Annotated[int, Field(ge=0, le=100)]
    liquidity_need: Band


class GoalRow(_Row):
    goal_id: GoalId
    customer_id: CustomerId
    goal_type: GoalType
    goal_name: Name
    target_amount: PositiveMoney
    current_funded_amount: NonNegativeMoney
    target_date: date
    priority: Band


class HoldingRow(_Row):
    account_id: AccountId
    instrument_id: InstrumentId
    quantity: Annotated[Decimal, Field(gt=0, max_digits=20, decimal_places=6)]
    avg_cost: Annotated[Decimal, Field(ge=0, max_digits=18, decimal_places=4)]
    snapshot_date: date
