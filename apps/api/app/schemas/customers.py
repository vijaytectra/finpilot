from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.models.enums import KycStatus, RiskLevel, Segment
from app.schemas.common import ApiModel, MoneyOut, Pagination

CustomerSort = Literal["customer_id", "full_name", "city", "-aum", "aum", "-onboarded_at"]


class CustomerListItem(ApiModel):
    customer_id: str
    full_name: str
    email: str
    city: str
    state: str
    kyc_status: KycStatus
    segment: Segment
    accounts: int
    aum: MoneyOut


class CustomerPage(BaseModel):
    items: list[CustomerListItem]
    pagination: Pagination


class RiskProfileOut(ApiModel):
    risk_score: int
    risk_level: RiskLevel
    assessed_at: date
    horizon_years: int
    liquidity_need: str


class CustomerProfile(ApiModel):
    customer_id: str
    full_name: str
    email: str
    phone: str
    city: str
    state: str
    date_of_birth: date
    onboarded_at: date
    kyc_status: KycStatus
    segment: Segment
    risk_profile: RiskProfileOut | None
    accounts: int
    goals: int
