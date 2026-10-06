from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, CustomerIdPath, PageParam, PageSizeParam, SessionDep
from app.models.enums import TransactionStatus, TransactionType
from app.repositories.customers import CustomerRepository
from app.repositories.transactions import TransactionFilter, TransactionRepository
from app.schemas.common import error_responses
from app.schemas.transactions import TransactionFacets, TransactionPage, TransactionSort
from app.services.customers import CustomerService
from app.services.transactions import TransactionService

router = APIRouter(prefix="/customers", tags=["transactions"])


def _service(session: SessionDep) -> TransactionService:
    return TransactionService(
        TransactionRepository(session), CustomerService(CustomerRepository(session))
    )


@router.get(
    "/{customer_id}/transactions",
    response_model=TransactionPage,
    summary="Server-side filtered, sorted and paginated transaction ledger",
    description=(
        "All filters combine with AND. `transaction_type` and `status` accept repeated "
        "values (`?transaction_type=BUY&transaction_type=SELL`). Ordering is deterministic "
        "(ties broken by transaction_id) so pages never shift between requests."
    ),
    responses=error_responses(401, 404, 422),
)
async def list_transactions(
    customer_id: CustomerIdPath,
    _: CurrentUser,
    session: SessionDep,
    date_from: date | None = None,
    date_to: date | None = None,
    account_id: Annotated[str | None, Query(pattern=r"^A\d{5,}$")] = None,
    instrument_id: Annotated[str | None, Query(pattern=r"^I\d{4,}$")] = None,
    transaction_type: Annotated[list[TransactionType] | None, Query()] = None,
    status: Annotated[list[TransactionStatus] | None, Query()] = None,
    sort: TransactionSort = "-trade_date",
    page: PageParam = 1,
    page_size: PageSizeParam = 25,
) -> TransactionPage:
    flt = TransactionFilter(
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
        instrument_id=instrument_id,
        transaction_types=sorted({t.value for t in transaction_type or []}),
        statuses=sorted({s.value for s in status or []}),
    )
    return await _service(session).page(flt, sort=sort, page=page, page_size=page_size)


@router.get(
    "/{customer_id}/transactions/facets",
    response_model=TransactionFacets,
    summary="Filter options (accounts, instruments, types, statuses, date range) with counts",
    responses=error_responses(401, 404, 422),
)
async def transaction_facets(
    customer_id: CustomerIdPath, _: CurrentUser, session: SessionDep
) -> TransactionFacets:
    return await _service(session).facets(customer_id)
