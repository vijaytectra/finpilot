from datetime import datetime
from decimal import Decimal
from typing import Annotated

from sqlalchemy import DateTime, MetaData, Numeric, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Deterministic constraint names so Alembic autogenerate/downgrades are stable.
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# Money in INR: 18 digits, 2 decimals. Prices / NAVs keep 4 decimals, units keep 6.
Money = Annotated[Decimal, mapped_column(Numeric(18, 2))]
Price = Annotated[Decimal, mapped_column(Numeric(18, 4))]
Units = Annotated[Decimal, mapped_column(Numeric(20, 6))]
Code = Annotated[str, mapped_column(String(20))]


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


def in_check(column: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({quoted})"
