from sqlalchemy import RowMapping

from app.core.errors import DomainValidationError
from app.repositories.transactions import TransactionFilter, TransactionRepository
from app.schemas.common import Pagination
from app.schemas.transactions import (
    FacetOption,
    TransactionFacets,
    TransactionOut,
    TransactionPage,
)
from app.services.customers import CustomerService


class TransactionService:
    def __init__(self, repo: TransactionRepository, customers: CustomerService) -> None:
        self._repo = repo
        self._customers = customers

    async def page(
        self, flt: TransactionFilter, *, sort: str, page: int, page_size: int
    ) -> TransactionPage:
        await self._customers.ensure_exists(flt.customer_id)
        if flt.date_from and flt.date_to and flt.date_from > flt.date_to:
            raise DomainValidationError(
                "date_from must be on or before date_to",
                details=[{"field": "date_from", "message": "must be <= date_to"}],
            )
        if flt.account_id and not await self._repo.account_belongs_to(
            flt.account_id, flt.customer_id
        ):
            # Not 404/403: the filter value is simply invalid for this customer.
            raise DomainValidationError(
                f"Account {flt.account_id} does not belong to customer {flt.customer_id}",
                details=[{"field": "account_id", "message": "unknown for this customer"}],
            )
        rows, total = await self._repo.page(
            flt, sort=sort, limit=page_size, offset=(page - 1) * page_size
        )
        return TransactionPage(
            items=[TransactionOut.model_validate(dict(r)) for r in rows],
            pagination=Pagination.build(page, page_size, total),
        )

    async def facets(self, customer_id: str) -> TransactionFacets:
        await self._customers.ensure_exists(customer_id)
        data = await self._repo.facets(customer_id)

        def options(rows: list[RowMapping]) -> list[FacetOption]:
            return [FacetOption.model_validate(dict(r)) for r in rows]

        return TransactionFacets(
            accounts=options(data.accounts),
            instruments=options(data.instruments),
            transaction_types=options(data.transaction_types),
            statuses=options(data.statuses),
            min_trade_date=data.min_trade_date,
            max_trade_date=data.max_trade_date,
        )
