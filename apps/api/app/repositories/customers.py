from typing import Any

from sqlalchemy import RowMapping, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.common import like_pattern

# Allow-list: user input selects one of these, never raw SQL.
_SORTS = {
    "customer_id": "c.customer_id ASC",
    "full_name": "c.full_name ASC, c.customer_id ASC",
    "city": "c.city ASC, c.customer_id ASC",
    "aum": "aum ASC, c.customer_id ASC",
    "-aum": "aum DESC, c.customer_id ASC",
    "-onboarded_at": "c.onboarded_at DESC, c.customer_id ASC",
}


class CustomerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def search(
        self,
        *,
        search: str | None,
        kyc_status: str | None,
        segment: str | None,
        sort: str,
        limit: int,
        offset: int,
    ) -> tuple[list[RowMapping], int]:
        where = ["TRUE"]
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if search:
            # search_text is a generated lower() column with a pg_trgm GIN index.
            where.append("c.search_text LIKE :pattern")
            params["pattern"] = like_pattern(search)
        if kyc_status:
            where.append("c.kyc_status = :kyc_status")
            params["kyc_status"] = kyc_status
        if segment:
            where.append("c.segment = :segment")
            params["segment"] = segment
        clause = " AND ".join(where)

        # One round trip: page + total via window function; AUM and account counts come
        # from pre-aggregated subqueries joined once (no per-customer queries).
        rows = (
            (
                await self._s.execute(
                    text(
                        f"""
                    SELECT c.customer_id, c.full_name, c.email, c.city, c.state,
                           c.kyc_status, c.segment,
                           coalesce(ac.accounts, 0)        AS accounts,
                           coalesce(aum.market_value, 0)   AS aum,
                           count(*) OVER ()                AS total
                    FROM customers c
                    LEFT JOIN (SELECT customer_id, count(*) AS accounts
                               FROM accounts GROUP BY customer_id) ac
                           ON ac.customer_id = c.customer_id
                    LEFT JOIN v_customer_aum aum ON aum.customer_id = c.customer_id
                    WHERE {clause}
                    ORDER BY {_SORTS[sort]}
                    LIMIT :limit OFFSET :offset
                    """  # noqa: S608 - clause/sort are built from fixed fragments
                    ),
                    params,
                )
            )
            .mappings()
            .all()
        )
        if rows:
            return list(rows), int(rows[0]["total"])
        if offset == 0:
            return [], 0
        # Page past the end: still report the true total.
        total = await self._s.scalar(
            text(f"SELECT count(*) FROM customers c WHERE {clause}"),  # noqa: S608
            params,
        )
        return [], int(total or 0)

    async def get_profile(self, customer_id: str) -> RowMapping | None:
        return (
            (
                await self._s.execute(
                    text(
                        """
                        SELECT c.*,
                               (SELECT count(*) FROM accounts a
                                 WHERE a.customer_id = c.customer_id) AS accounts,
                               (SELECT count(*) FROM goals g
                                 WHERE g.customer_id = c.customer_id) AS goals,
                               r.risk_score, r.risk_level, r.assessed_at, r.horizon_years,
                               r.liquidity_need
                        FROM customers c
                        LEFT JOIN v_latest_risk_profile r ON r.customer_id = c.customer_id
                        WHERE c.customer_id = :customer_id
                        """
                    ),
                    {"customer_id": customer_id},
                )
            )
            .mappings()
            .one_or_none()
        )

    async def exists(self, customer_id: str) -> bool:
        return bool(
            await self._s.scalar(
                text("SELECT EXISTS (SELECT 1 FROM customers WHERE customer_id = :id)"),
                {"id": customer_id},
            )
        )
