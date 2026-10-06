from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainValidationError, NotFoundError
from app.core.logging import get_logger
from app.models import Goal
from app.models.enums import Band, GoalType
from app.repositories.goals import GoalRepository
from app.schemas.goals import GoalCreate, GoalFlag, GoalList, GoalOut, GoalSummary, GoalUpdate
from app.services.customers import CustomerService

log = get_logger("app.goals")

ZERO = Decimal(0)
UNDERFUNDED_THRESHOLD = Decimal(25)


class GoalNotFoundError(NotFoundError):
    code = "GOAL_NOT_FOUND"

    def __init__(self, goal_id: str) -> None:
        super().__init__(f"Goal {goal_id} was not found")


def goal_flags(goal: Goal, today: date) -> list[GoalFlag]:
    """Business rules for highlighting overdue / inconsistent goals (pure; unit-tested)."""
    flags: list[GoalFlag] = []
    funded_pct = goal.current_funded_amount * 100 / goal.target_amount
    if goal.target_date < today and goal.current_funded_amount < goal.target_amount:
        flags.append(GoalFlag.OVERDUE)
    if goal.current_funded_amount > goal.target_amount:
        flags.append(GoalFlag.OVERFUNDED)
    if goal.goal_type.replace("_", " ").lower() not in goal.goal_name.lower():
        flags.append(GoalFlag.NAME_TYPE_MISMATCH)
    if goal.priority == "HIGH" and funded_pct < UNDERFUNDED_THRESHOLD:
        flags.append(GoalFlag.HIGH_PRIORITY_UNDERFUNDED)
    return flags


def to_out(goal: Goal, today: date) -> GoalOut:
    return GoalOut(
        goal_id=goal.goal_id,
        customer_id=goal.customer_id,
        goal_type=GoalType(goal.goal_type),
        goal_name=goal.goal_name,
        target_amount=goal.target_amount,
        current_funded_amount=goal.current_funded_amount,
        remaining_amount=max(goal.target_amount - goal.current_funded_amount, ZERO),
        funded_pct=goal.current_funded_amount * 100 / goal.target_amount,
        target_date=goal.target_date,
        priority=Band(goal.priority),
        flags=goal_flags(goal, today),
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


def _field_error(field: str, message: str) -> DomainValidationError:
    return DomainValidationError(message, details=[{"field": field, "message": message}])


class GoalService:
    def __init__(
        self,
        session: AsyncSession,
        customers: CustomerService,
        today: date | None = None,
    ) -> None:
        self._session = session
        self._goals = GoalRepository(session)
        self._customers = customers
        self._today = today or date.today()

    async def list(self, customer_id: str) -> GoalList:
        await self._customers.ensure_exists(customer_id)
        items = [to_out(g, self._today) for g in await self._goals.list_for_customer(customer_id)]
        total_target = sum((g.target_amount for g in items), ZERO)
        total_funded = sum((g.current_funded_amount for g in items), ZERO)
        return GoalList(
            items=items,
            summary=GoalSummary(
                goals=len(items),
                total_target=total_target,
                total_funded=total_funded,
                funded_pct=total_funded * 100 / total_target if total_target else None,
                flagged=sum(1 for g in items if g.flags),
            ),
        )

    async def create(self, customer_id: str, payload: GoalCreate, user_id: int) -> GoalOut:
        await self._customers.ensure_exists(customer_id)
        if payload.target_date <= self._today:
            raise _field_error("target_date", "target_date must be in the future")
        goal = await self._goals.create(customer_id, payload.model_dump(mode="python"))
        await self._session.commit()
        log.info("goal_created", goal_id=goal.goal_id, customer_id=customer_id, by=user_id)
        return to_out(goal, self._today)

    async def update(self, goal_id: str, payload: GoalUpdate, user_id: int) -> GoalOut:
        goal = await self._goals.get(goal_id, for_update=True)
        if goal is None:
            raise GoalNotFoundError(goal_id)
        changes: dict[str, Any] = payload.model_dump(exclude_unset=True, mode="python")

        target = changes.get("target_amount", goal.target_amount)
        funded = changes.get("current_funded_amount", goal.current_funded_amount)
        if funded > target:
            raise _field_error(
                "current_funded_amount", "current_funded_amount cannot exceed target_amount"
            )
        # Only a *changed* date must be in the future, so an overdue goal can still be edited
        # (e.g. to record funding) without forcing a new date.
        if "target_date" in changes and changes["target_date"] <= self._today:
            raise _field_error("target_date", "target_date must be in the future")

        updated = await self._goals.update(goal_id, changes)
        await self._session.commit()
        log.info("goal_updated", goal_id=goal_id, fields=sorted(changes), by=user_id)
        return to_out(updated, self._today)
