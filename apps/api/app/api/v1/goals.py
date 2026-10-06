from typing import Annotated

from fastapi import APIRouter, Path, Response, status

from app.api.deps import CurrentUser, CustomerIdPath, SessionDep
from app.repositories.customers import CustomerRepository
from app.schemas.common import error_responses
from app.schemas.goals import GoalCreate, GoalList, GoalOut, GoalUpdate
from app.services.customers import CustomerService
from app.services.goals import GoalService

router = APIRouter(tags=["goals"])

GoalIdPath = Annotated[str, Path(pattern=r"^G\d{5,}$", examples=["G00007"])]


def _service(session: SessionDep) -> GoalService:
    return GoalService(session, CustomerService(CustomerRepository(session)))


@router.get(
    "/customers/{customer_id}/goals",
    response_model=GoalList,
    summary="Customer goals with funded % and consistency flags",
    description=(
        "`flags` highlights OVERDUE (date passed, not fully funded), OVERFUNDED, "
        "NAME_TYPE_MISMATCH (goal_name describes a different goal_type) and "
        "HIGH_PRIORITY_UNDERFUNDED (< 25 %)."
    ),
    responses=error_responses(401, 404, 422),
)
async def list_goals(customer_id: CustomerIdPath, _: CurrentUser, session: SessionDep) -> GoalList:
    return await _service(session).list(customer_id)


@router.post(
    "/customers/{customer_id}/goals",
    response_model=GoalOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a validated goal",
    description=(
        "Rules: target_amount > 0; 0 <= current_funded_amount <= target_amount; "
        "target_date in the future. The goal id is assigned by the database."
    ),
    responses=error_responses(401, 404, 422),
)
async def create_goal(
    customer_id: CustomerIdPath,
    payload: GoalCreate,
    user: CurrentUser,
    session: SessionDep,
    response: Response,
) -> GoalOut:
    goal = await _service(session).create(customer_id, payload, user.id)
    response.headers["Location"] = f"/api/v1/goals/{goal.goal_id}"
    return goal


@router.patch(
    "/goals/{goal_id}",
    response_model=GoalOut,
    summary="Edit selected goal fields",
    description=(
        "Partial update; only provided fields change. Cross-field rules are validated "
        "against the merged result. A changed target_date must be in the future; an "
        "overdue goal can still be edited without changing its date."
    ),
    responses=error_responses(401, 404, 422),
)
async def update_goal(
    goal_id: GoalIdPath, payload: GoalUpdate, user: CurrentUser, session: SessionDep
) -> GoalOut:
    return await _service(session).update(goal_id, payload, user.id)
