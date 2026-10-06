"""Firm-wide reporting queries. These are also the answers to the assignment's
'SQL tasks the reviewer may ask you to demonstrate' (see docs/sql/reviewer-queries.sql)."""

from sqlalchemy import RowMapping, text
from sqlalchemy.ext.asyncio import AsyncSession

LATEST_SNAPSHOT = "(SELECT max(snapshot_date) FROM holdings_snapshot)"


class ReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def _rows(self, sql: str) -> list[RowMapping]:
        return list((await self._s.execute(text(sql))).mappings())

    async def headline(self) -> RowMapping:
        return (
            (
                await self._s.execute(
                    text(
                        f"""
                        SELECT
                          (SELECT count(*) FROM customers)                 AS customers,
                          (SELECT count(*) FROM accounts)                  AS accounts,
                          (SELECT count(*) FROM accounts
                            WHERE status = 'ACTIVE')                       AS active_accounts,
                          (SELECT count(*) FROM v_customer_aum)            AS with_holdings,
                          (SELECT coalesce(sum(market_value), 0)
                             FROM v_customer_aum)                          AS aum,
                          (SELECT count(*) FROM transactions)              AS transactions,
                          (SELECT count(*) FROM goals)                     AS goals,
                          {LATEST_SNAPSHOT}                                AS snapshot_date,
                          (SELECT max(price_as_of) FROM instruments)       AS price_as_of
                        """  # noqa: S608 - constant fragment
                    )
                )
            )
            .mappings()
            .one()
        )

    async def top_customers(self, limit: int = 10) -> list[RowMapping]:
        # Task: top 10 customers by current snapshot AUM.
        return await self._rows(
            f"""
            SELECT c.customer_id, c.full_name, c.segment, a.market_value AS aum
            FROM v_customer_aum a JOIN customers c ON c.customer_id = a.customer_id
            ORDER BY a.market_value DESC, c.customer_id
            LIMIT {int(limit)}
            """  # noqa: S608 - int-cast constant
        )

    async def allocation(self) -> list[RowMapping]:
        # Task: asset-class allocation for the whole dataset (percentage computed in SQL).
        return await self._rows(
            f"""
            SELECT asset_class,
                   sum(market_value)                                        AS market_value,
                   100 * sum(market_value) / sum(sum(market_value)) OVER () AS weight_pct
            FROM v_position_valuation
            WHERE snapshot_date = {LATEST_SNAPSHOT}
            GROUP BY asset_class
            ORDER BY market_value DESC
            """  # noqa: S608 - constant fragment
        )

    async def monthly_net_flows(self) -> list[RowMapping]:
        # Task: monthly BUY/SELL net cash flow for the last 12 months. Months without trades
        # are emitted as zero rows (generate_series) so charts have a continuous axis.
        return await self._rows(
            """
            WITH months AS (
                SELECT generate_series(
                         date_trunc('month', current_date) - interval '11 months',
                         date_trunc('month', current_date),
                         interval '1 month')::date AS month
            )
            SELECT m.month,
                   coalesce(f.buy_amount, 0)   AS buy_amount,
                   coalesce(f.sell_amount, 0)  AS sell_amount,
                   coalesce(f.net_invested, 0) AS net_invested,
                   coalesce(f.trades, 0)       AS trades
            FROM months m LEFT JOIN v_monthly_net_flows f ON f.month = m.month
            ORDER BY m.month
            """
        )

    async def top_instruments_by_holders(self, limit: int = 10) -> list[RowMapping]:
        # Task: top instruments by number of distinct holders (customers, not accounts).
        return await self._rows(
            f"""
            SELECT i.instrument_id, i.symbol, i.instrument_name, i.asset_class,
                   count(DISTINCT a.customer_id) AS holders
            FROM holdings_snapshot h
            JOIN accounts a    ON a.account_id = h.account_id
            JOIN instruments i ON i.instrument_id = h.instrument_id
            WHERE h.snapshot_date = {LATEST_SNAPSHOT}
            GROUP BY i.instrument_id, i.symbol, i.instrument_name, i.asset_class
            ORDER BY holders DESC, i.instrument_id
            LIMIT {int(limit)}
            """  # noqa: S608 - constant fragment / int-cast
        )

    async def high_priority_underfunded_goals(self) -> list[RowMapping]:
        # Task: customers with high-priority goals below 25 % funded.
        return await self._rows(
            """
            SELECT g.goal_id, g.customer_id, c.full_name, g.goal_type, g.target_amount,
                   g.current_funded_amount,
                   100 * g.current_funded_amount / g.target_amount AS funded_pct,
                   g.target_date
            FROM goals g JOIN customers c ON c.customer_id = g.customer_id
            WHERE g.priority = 'HIGH' AND g.current_funded_amount < 0.25 * g.target_amount
            ORDER BY funded_pct, g.goal_id
            """
        )

    async def data_quality(self) -> list[RowMapping]:
        # Task: data-quality / reconciliation exceptions. DISTINCT entity_ref so re-importing
        # the same file does not inflate the counts.
        return await self._rows(
            """
            SELECT exception_type, rule, entity, count(DISTINCT entity_ref) AS count
            FROM v_data_quality_exceptions
            GROUP BY exception_type, rule, entity
            ORDER BY exception_type, count DESC
            """
        )
