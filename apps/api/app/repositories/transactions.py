from dataclasses import dataclass, field
from datetime import date
from typing import Any

from sqlalchemy import RowMapping, bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

_SORTS = {
    "-trade_date": "t.trade_date DESC, t.transaction_id DESC",
    "trade_date": "t.trade_date ASC, t.transaction_id ASC",
    "-amount": "t.amount DESC, t.transaction_id DESC",
    "amount": "t.amount ASC, t.transaction_id ASC",
}


@dataclass(frozen=True, slots=True)
class TransactionFilter:
    customer_id: str
    date_from: date | None = None
    date_to: date | None = None
    account_id: str | None = None
    instrument_id: str | None = None
    transaction_types: list[str] = field(default_factory=list)
    statuses: list[str] = field(default_factory=list)

    def where(self) -> tuple[str, dict[str, Any]]:
        # Scope through the customer's accounts so the (account_id, trade_date DESC, id DESC)
        # index serves both the filter and the ORDER BY.
        clauses = [
            "t.account_id IN (SELECT account_id FROM accounts WHERE customer_id = :customer_id)"
        ]
        params: dict[str, Any] = {"customer_id": self.customer_id}
        if self.date_from:
            clauses.append("t.trade_date >= :date_from")
            params["date_from"] = self.date_from
        if self.date_to:
            clauses.append("t.trade_date <= :date_to")
            params["date_to"] = self.date_to
        if self.account_id:
            clauses.append("t.account_id = :account_id")
            params["account_id"] = self.account_id
        if self.instrument_id:
            clauses.append("t.instrument_id = :instrument_id")
            params["instrument_id"] = self.instrument_id
        if self.transaction_types:
            clauses.append("t.transaction_type IN :transaction_types")
            params["transaction_types"] = self.transaction_types
        if self.statuses:
            clauses.append("t.status IN :statuses")
            params["statuses"] = self.statuses
        return " AND ".join(clauses), params


def _expanding(sql: str, params: dict[str, Any]) -> Any:
    stmt = text(sql)
    for name in ("transaction_types", "statuses"):
        if name in params:
            stmt = stmt.bindparams(bindparam(name, expanding=True))
    return stmt


class TransactionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def page(
        self, flt: TransactionFilter, *, sort: str, limit: int, offset: int
    ) -> tuple[list[RowMapping], int]:
        where, params = flt.where()
        total = await self._s.scalar(
            _expanding(f"SELECT count(*) FROM transactions t WHERE {where}", params),  # noqa: S608
            params,
        )
        rows = await self._s.execute(
            _expanding(
                f"""
                SELECT t.transaction_id, t.account_id, t.instrument_id, i.symbol,
                       i.instrument_name, i.asset_class, t.transaction_type, t.trade_date,
                       t.quantity, t.price, t.amount, t.status
                FROM transactions t
                JOIN instruments i ON i.instrument_id = t.instrument_id
                WHERE {where}
                ORDER BY {_SORTS[sort]}
                LIMIT :limit OFFSET :offset
                """,  # noqa: S608 - where/sort assembled from fixed fragments
                params,
            ),
            {**params, "limit": limit, "offset": offset},
        )
        return list(rows.mappings()), int(total or 0)

    async def account_belongs_to(self, account_id: str, customer_id: str) -> bool:
        return bool(
            await self._s.scalar(
                text(
                    "SELECT EXISTS (SELECT 1 FROM accounts"
                    " WHERE account_id = :a AND customer_id = :c)"
                ),
                {"a": account_id, "c": customer_id},
            )
        )

    async def facets(self, customer_id: str) -> "FacetRows":
        scope = (
            "FROM transactions t WHERE t.account_id IN"
            " (SELECT account_id FROM accounts WHERE customer_id = :c)"
        )
        params = {"c": customer_id}

        async def grouped(sql: str) -> list[RowMapping]:
            return list((await self._s.execute(text(sql), params)).mappings())

        rng = (
            await self._s.execute(
                text("SELECT min(trade_date) AS lo, max(trade_date) AS hi " + scope), params
            )
        ).one()
        return FacetRows(
            min_trade_date=rng.lo,
            max_trade_date=rng.hi,
            accounts=await grouped(
                "SELECT a.account_id AS value,"
                " a.account_id || ' · ' || a.account_type || ' · ' || a.provider AS label,"
                " count(t.transaction_id) AS count"
                " FROM accounts a LEFT JOIN transactions t ON t.account_id = a.account_id"
                " WHERE a.customer_id = :c GROUP BY a.account_id ORDER BY a.account_id"
            ),
            instruments=await grouped(
                "SELECT t.instrument_id AS value, i.symbol || ' · ' || i.instrument_name AS label,"
                " count(*) AS count FROM transactions t"
                " JOIN instruments i ON i.instrument_id = t.instrument_id"
                " WHERE t.account_id IN (SELECT account_id FROM accounts WHERE customer_id = :c)"
                " GROUP BY t.instrument_id, i.symbol, i.instrument_name ORDER BY i.symbol"
            ),
            transaction_types=await grouped(
                "SELECT transaction_type AS value, transaction_type AS label, count(*) AS count "
                + scope
                + " GROUP BY transaction_type ORDER BY transaction_type"
            ),
            statuses=await grouped(
                "SELECT status AS value, status AS label, count(*) AS count "
                + scope
                + " GROUP BY status ORDER BY status"
            ),
        )


@dataclass(frozen=True, slots=True)
class FacetRows:
    accounts: list[RowMapping]
    instruments: list[RowMapping]
    transaction_types: list[RowMapping]
    statuses: list[RowMapping]
    min_trade_date: date | None
    max_trade_date: date | None
