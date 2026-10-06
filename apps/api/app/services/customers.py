from app.core.errors import NotFoundError
from app.repositories.customers import CustomerRepository
from app.schemas.common import Pagination
from app.schemas.customers import (
    CustomerListItem,
    CustomerPage,
    CustomerProfile,
    RiskProfileOut,
)


class CustomerNotFoundError(NotFoundError):
    code = "CUSTOMER_NOT_FOUND"

    def __init__(self, customer_id: str) -> None:
        super().__init__(f"Customer {customer_id} was not found")


class CustomerService:
    def __init__(self, customers: CustomerRepository) -> None:
        self._customers = customers

    async def search(
        self,
        *,
        search: str | None,
        kyc_status: str | None,
        segment: str | None,
        sort: str,
        page: int,
        page_size: int,
    ) -> CustomerPage:
        rows, total = await self._customers.search(
            search=search.strip() if search and search.strip() else None,
            kyc_status=kyc_status,
            segment=segment,
            sort=sort,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return CustomerPage(
            items=[CustomerListItem.model_validate(dict(r)) for r in rows],
            pagination=Pagination.build(page, page_size, total),
        )

    async def profile(self, customer_id: str) -> CustomerProfile:
        row = await self._customers.get_profile(customer_id)
        if row is None:
            raise CustomerNotFoundError(customer_id)
        data = dict(row)
        risk = RiskProfileOut.model_validate(data) if data.get("risk_score") is not None else None
        return CustomerProfile.model_validate({**data, "risk_profile": risk})

    async def ensure_exists(self, customer_id: str) -> None:
        if not await self._customers.exists(customer_id):
            raise CustomerNotFoundError(customer_id)
