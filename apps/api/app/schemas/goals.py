from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationInfo,
    field_validator,
    model_validator,
)

from app.models.enums import Band, GoalType
from app.schemas.common import ApiModel, MoneyOut, PercentOut

AmountIn = Annotated[Decimal, Field(max_digits=14, decimal_places=2, examples=[5000000])]
GoalName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


class GoalFlag(StrEnum):
    OVERDUE = "OVERDUE"  # target date passed while not fully funded
    OVERFUNDED = "OVERFUNDED"  # funded amount exceeds target (data inconsistency)
    NAME_TYPE_MISMATCH = "NAME_TYPE_MISMATCH"  # goal_name describes a different goal_type
    HIGH_PRIORITY_UNDERFUNDED = "HIGH_PRIORITY_UNDERFUNDED"  # HIGH priority and < 25 % funded


class GoalOut(ApiModel):
    goal_id: str
    customer_id: str
    goal_type: GoalType
    goal_name: str
    target_amount: MoneyOut
    current_funded_amount: MoneyOut
    remaining_amount: MoneyOut
    funded_pct: PercentOut = Field(description="current_funded_amount / target_amount x 100")
    target_date: date
    priority: Band
    flags: list[GoalFlag]
    created_at: datetime
    updated_at: datetime


class GoalSummary(BaseModel):
    goals: int
    total_target: MoneyOut
    total_funded: MoneyOut
    funded_pct: PercentOut | None
    flagged: int


class GoalList(BaseModel):
    items: list[GoalOut]
    summary: GoalSummary


class GoalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goal_type: GoalType
    goal_name: GoalName
    target_amount: Annotated[AmountIn, Field(gt=0)]
    current_funded_amount: Annotated[AmountIn, Field(ge=0)] = Decimal(0)
    target_date: date
    priority: Band = Band.MEDIUM

    # Field-level (not model-level) so the 422 detail names `current_funded_amount` and
    # clients can attach the message to that input. target_amount is declared first, so it is
    # already in info.data when valid; if it is invalid its own error is reported instead.
    @field_validator("current_funded_amount")
    @classmethod
    def _funded_within_target(cls, value: Decimal, info: ValidationInfo) -> Decimal:
        target = info.data.get("target_amount")
        if target is not None and value > target:
            raise ValueError("cannot exceed target_amount")
        return value


class GoalUpdate(BaseModel):
    """Partial update. Cross-field rules are checked against the merged result."""

    model_config = ConfigDict(extra="forbid")

    goal_type: GoalType | None = None
    goal_name: GoalName | None = None
    target_amount: Annotated[AmountIn, Field(gt=0)] | None = None
    current_funded_amount: Annotated[AmountIn, Field(ge=0)] | None = None
    target_date: date | None = None
    priority: Band | None = None

    @model_validator(mode="after")
    def _not_empty(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        nulls = [f for f in self.model_fields_set if getattr(self, f) is None]
        if nulls:
            raise ValueError(f"fields cannot be null: {', '.join(sorted(nulls))}")
        return self
