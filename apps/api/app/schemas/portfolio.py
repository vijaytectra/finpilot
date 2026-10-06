from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import AccountStatus, AccountType, AssetClass
from app.schemas.common import ApiModel, MoneyOut, PercentOut, QuantityOut


class Valuation(BaseModel):
    market_value: MoneyOut
    cost_basis: MoneyOut
    unrealized_pnl: MoneyOut
    unrealized_pnl_pct: PercentOut | None = Field(
        description="unrealized_pnl / cost_basis x 100; null when cost basis is zero"
    )
    positions: int


class AccountValuation(Valuation):
    account_id: str
    account_type: AccountType
    provider: str
    status: AccountStatus
    opened_at: date


class AllocationSlice(BaseModel):
    asset_class: AssetClass
    market_value: MoneyOut
    weight_pct: PercentOut
    positions: int


class Position(ApiModel):
    account_id: str
    instrument_id: str
    symbol: str
    instrument_name: str
    asset_class: AssetClass
    sector: str | None
    risk_band: str
    quantity: QuantityOut
    avg_cost: QuantityOut
    last_price: QuantityOut
    price_as_of: date
    market_value: MoneyOut
    cost_basis: MoneyOut
    unrealized_pnl: MoneyOut
    unrealized_pnl_pct: PercentOut | None
    weight_pct: PercentOut


class DataFreshness(BaseModel):
    snapshot_date: date | None = Field(description="Holdings snapshot used for valuation")
    price_as_of: date | None = Field(description="Latest price date among held instruments")
    oldest_price_as_of: date | None
    stale_prices: bool = Field(description="True if any price predates the snapshot date")


class Portfolio(BaseModel):
    customer_id: str
    currency: str = "INR"
    freshness: DataFreshness
    totals: Valuation
    accounts: list[AccountValuation]
    allocation: list[AllocationSlice]
    positions: list[Position]
