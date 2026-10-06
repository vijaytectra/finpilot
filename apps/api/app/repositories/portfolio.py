from datetime import date

from sqlalchemy import RowMapping, text
from sqlalchemy.ext.asyncio import AsyncSession


class PortfolioRepository:
    """All valuation maths runs in PostgreSQL (v_position_valuation, NUMERIC); Python only
    shapes the already-aggregated, customer-sized result."""

    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def latest_snapshot_date(self) -> date | None:
        # max() over the leading PK column -> index-only lookup.
        value = await self._s.scalar(text("SELECT max(snapshot_date) FROM holdings_snapshot"))
        return value if isinstance(value, date) else None

    async def accounts(self, customer_id: str) -> list[RowMapping]:
        result = await self._s.execute(
            text(
                "SELECT account_id, account_type, provider, status, opened_at"
                " FROM accounts WHERE customer_id = :customer_id ORDER BY account_id"
            ),
            {"customer_id": customer_id},
        )
        return list(result.mappings())

    async def aggregates(self, customer_id: str, snapshot_date: date) -> list[RowMapping]:
        """Account totals, asset-class totals and the grand total in ONE pass via
        GROUPING SETS. `level` tells the three row kinds apart."""
        result = await self._s.execute(
            text(
                """
                SELECT CASE
                         WHEN grouping(account_id) = 0 THEN 'account'
                         WHEN grouping(asset_class) = 0 THEN 'asset_class'
                         ELSE 'total'
                       END                                AS level,
                       account_id,
                       asset_class,
                       count(*)                           AS positions,
                       sum(market_value)                  AS market_value,
                       sum(cost_basis)                    AS cost_basis,
                       sum(unrealized_pnl)                AS unrealized_pnl,
                       max(price_as_of)                   AS price_as_of,
                       min(price_as_of)                   AS oldest_price_as_of
                FROM v_position_valuation
                WHERE customer_id = :customer_id AND snapshot_date = :snapshot_date
                GROUP BY GROUPING SETS ((account_id), (asset_class), ())
                """
            ),
            {"customer_id": customer_id, "snapshot_date": snapshot_date},
        )
        return list(result.mappings())

    async def positions(self, customer_id: str, snapshot_date: date) -> list[RowMapping]:
        result = await self._s.execute(
            text(
                """
                SELECT account_id, instrument_id, symbol, instrument_name, asset_class, sector,
                       risk_band, quantity, avg_cost, last_price, price_as_of,
                       market_value, cost_basis, unrealized_pnl,
                       round(100 * unrealized_pnl / nullif(cost_basis, 0), 4)
                                                                    AS unrealized_pnl_pct,
                       round(100 * market_value
                             / nullif(sum(market_value) OVER (), 0), 4) AS weight_pct
                FROM v_position_valuation
                WHERE customer_id = :customer_id AND snapshot_date = :snapshot_date
                ORDER BY market_value DESC, account_id, instrument_id
                """
            ),
            {"customer_id": customer_id, "snapshot_date": snapshot_date},
        )
        return list(result.mappings())
