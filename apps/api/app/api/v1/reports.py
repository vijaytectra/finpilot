from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.repositories.reports import ReportRepository
from app.schemas.common import error_responses
from app.schemas.reports import (
    AllocationRow,
    ExceptionCount,
    Headline,
    InstrumentHolders,
    MonthlyFlow,
    Overview,
    TopCustomer,
    UnderfundedGoal,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/overview",
    response_model=Overview,
    summary="Firm-wide operational overview",
    description=(
        "Headline counts and AUM, top 10 customers by AUM, dataset-wide asset allocation, "
        "monthly settled BUY/SELL net flows for the last 12 months, top instruments by "
        "distinct holders, HIGH-priority goals under 25 % funded and data-quality "
        "exception counts. Every figure is an aggregate query; nothing is hard-coded."
    ),
    responses=error_responses(401),
)
async def overview(_: CurrentUser, session: SessionDep) -> Overview:
    repo = ReportRepository(session)
    headline = dict(await repo.headline())
    headline["customers_with_holdings"] = headline.pop("with_holdings")
    return Overview(
        headline=Headline.model_validate(headline),
        top_customers=[TopCustomer.model_validate(dict(r)) for r in await repo.top_customers()],
        allocation=[AllocationRow.model_validate(dict(r)) for r in await repo.allocation()],
        monthly_net_flows=[
            MonthlyFlow.model_validate(dict(r)) for r in await repo.monthly_net_flows()
        ],
        top_instruments_by_holders=[
            InstrumentHolders.model_validate(dict(r))
            for r in await repo.top_instruments_by_holders()
        ],
        high_priority_underfunded_goals=[
            UnderfundedGoal.model_validate(dict(r))
            for r in await repo.high_priority_underfunded_goals()
        ],
        data_quality=[ExceptionCount.model_validate(dict(r)) for r in await repo.data_quality()],
    )
