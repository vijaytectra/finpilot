from datetime import date

from pydantic import BaseModel

from app.models.enums import AssetClass
from app.schemas.common import ApiModel, MoneyOut, PercentOut


class Headline(BaseModel):
    customers: int
    accounts: int
    active_accounts: int
    customers_with_holdings: int
    aum: MoneyOut
    transactions: int
    goals: int
    snapshot_date: date | None
    price_as_of: date | None


class TopCustomer(ApiModel):
    customer_id: str
    full_name: str
    segment: str
    aum: MoneyOut


class AllocationRow(ApiModel):
    asset_class: AssetClass
    market_value: MoneyOut
    weight_pct: PercentOut


class MonthlyFlow(ApiModel):
    month: date
    buy_amount: MoneyOut
    sell_amount: MoneyOut
    net_invested: MoneyOut
    trades: int


class InstrumentHolders(ApiModel):
    instrument_id: str
    symbol: str
    instrument_name: str
    asset_class: AssetClass
    holders: int


class UnderfundedGoal(ApiModel):
    goal_id: str
    customer_id: str
    full_name: str
    goal_type: str
    target_amount: MoneyOut
    current_funded_amount: MoneyOut
    funded_pct: PercentOut
    target_date: date


class ExceptionCount(ApiModel):
    exception_type: str
    rule: str
    entity: str
    count: int


class Overview(BaseModel):
    headline: Headline
    top_customers: list[TopCustomer]
    allocation: list[AllocationRow]
    monthly_net_flows: list[MonthlyFlow]
    top_instruments_by_holders: list[InstrumentHolders]
    high_priority_underfunded_goals: list[UnderfundedGoal]
    data_quality: list[ExceptionCount]
