from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, CustomerIdPath, PageParam, PageSizeParam, SessionDep
from app.models.enums import KycStatus, Segment
from app.repositories.customers import CustomerRepository
from app.schemas.common import error_responses
from app.schemas.customers import CustomerPage, CustomerProfile, CustomerSort
from app.services.customers import CustomerService

router = APIRouter(prefix="/customers", tags=["customers"])


def _service(session: SessionDep) -> CustomerService:
    return CustomerService(CustomerRepository(session))


@router.get(
    "",
    response_model=CustomerPage,
    summary="Search and page customers",
    description=(
        "`search` matches case-insensitively anywhere in customer id, name, e-mail or city "
        "(trigram-indexed). Results include account count and current AUM."
    ),
    responses=error_responses(401, 422),
)
async def list_customers(
    _: CurrentUser,
    session: SessionDep,
    search: Annotated[str | None, Query(max_length=100, examples=["aarav"])] = None,
    kyc_status: KycStatus | None = None,
    segment: Segment | None = None,
    sort: CustomerSort = "customer_id",
    page: PageParam = 1,
    page_size: PageSizeParam = 20,
) -> CustomerPage:
    return await _service(session).search(
        search=search,
        kyc_status=kyc_status.value if kyc_status else None,
        segment=segment.value if segment else None,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{customer_id}",
    response_model=CustomerProfile,
    summary="Customer profile with latest risk assessment",
    responses=error_responses(401, 404, 422),
)
async def get_customer(
    customer_id: CustomerIdPath, _: CurrentUser, session: SessionDep
) -> CustomerProfile:
    return await _service(session).profile(customer_id)
