from typing import Any

from sqlalchemy import case, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Goal


class GoalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def list_for_customer(self, customer_id: str) -> list[Goal]:
        priority_rank = case({"HIGH": 0, "MEDIUM": 1, "LOW": 2}, value=Goal.priority, else_=3)
        result = await self._s.execute(
            select(Goal)
            .where(Goal.customer_id == customer_id)
            .order_by(priority_rank, Goal.target_date, Goal.goal_id)
        )
        return list(result.scalars())

    async def get(self, goal_id: str, *, for_update: bool = False) -> Goal | None:
        stmt = select(Goal).where(Goal.goal_id == goal_id)
        if for_update:
            stmt = stmt.with_for_update()  # serialize concurrent edits of the same goal
        return (await self._s.execute(stmt)).scalar_one_or_none()

    async def create(self, customer_id: str, values: dict[str, Any]) -> Goal:
        goal_id = (
            await self._s.execute(
                insert(Goal).values(customer_id=customer_id, **values).returning(Goal.goal_id)
            )
        ).scalar_one()
        goal = await self.get(goal_id)
        assert goal is not None  # noqa: S101 - just inserted in this transaction
        return goal

    async def update(self, goal_id: str, values: dict[str, Any]) -> Goal:
        await self._s.execute(
            update(Goal)
            .where(Goal.goal_id == goal_id)
            .values(**values)
            .execution_options(synchronize_session=False)
        )
        self._s.expire_all()
        goal = await self.get(goal_id)
        assert goal is not None  # noqa: S101 - row locked by caller
        return goal
