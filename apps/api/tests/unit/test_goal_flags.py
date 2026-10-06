from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.models import Goal
from app.schemas.goals import GoalFlag
from app.services.goals import goal_flags

TODAY = date(2026, 10, 6)


def _goal(**kw: object) -> Goal:
    base: dict[str, object] = {
        "goal_id": "G00001",
        "customer_id": "C0001",
        "goal_type": "RETIREMENT",
        "goal_name": "Primary Retirement",
        "target_amount": Decimal(1000),
        "current_funded_amount": Decimal(500),
        "target_date": date(2030, 1, 1),
        "priority": "MEDIUM",
        "created_at": datetime(2026, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2026, 1, 1, tzinfo=UTC),
    }
    return Goal(**(base | kw))


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({}, []),
        ({"target_date": date(2026, 10, 5)}, [GoalFlag.OVERDUE]),
        # Past date but fully funded: achieved, not overdue.
        ({"target_date": date(2026, 1, 1), "current_funded_amount": Decimal(1000)}, []),
        ({"current_funded_amount": Decimal(1500)}, [GoalFlag.OVERFUNDED]),
        ({"goal_name": "Family Travel"}, [GoalFlag.NAME_TYPE_MISMATCH]),
        ({"goal_type": "HOME_PURCHASE", "goal_name": "Long-term Home Purchase"}, []),
        (
            {"priority": "HIGH", "current_funded_amount": Decimal(249)},
            [GoalFlag.HIGH_PRIORITY_UNDERFUNDED],
        ),
        ({"priority": "HIGH", "current_funded_amount": Decimal(250)}, []),  # exactly 25 %
    ],
)
def test_goal_flags(overrides: dict[str, object], expected: list[GoalFlag]) -> None:
    assert goal_flags(_goal(**overrides), TODAY) == expected
