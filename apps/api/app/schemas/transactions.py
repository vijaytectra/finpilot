from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.models.enums import AssetClass, TransactionStatus, TransactionType
from app.schemas.common import ApiModel, MoneyOut, Pagination, QuantityOut

TransactionSort = Literal["-trade_date", "trade_date", "-amount", "amount"]


class TransactionOut(ApiModel):
    transaction_id: str
    account_id: str
    instrument_id: str
    symbol: str
    instrument_name: str
    asset_class: AssetClass
    transaction_type: TransactionType
    trade_date: date
    quantity: QuantityOut
    price: QuantityOut
    amount: MoneyOut
    status: TransactionStatus


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    pagination: Pagination


class FacetOption(BaseModel):
    value: str
    label: str
    count: int


class TransactionFacets(BaseModel):
    """Filter options limited to values that actually occur for this customer."""

    accounts: list[FacetOption]
    instruments: list[FacetOption]
    transaction_types: list[FacetOption]
    statuses: list[FacetOption]
    min_trade_date: date | None
    max_trade_date: date | None
