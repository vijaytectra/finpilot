"""customer trigram search + reporting views (valuation, AUM, flows, data-quality exceptions)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-06

Views are plain (not materialized): at this data size they are cheap, always fresh, and
need no refresh orchestration. Materializing v_customer_aum is the first step if the
holdings table grows by orders of magnitude.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


VIEWS: dict[str, str] = {
    # Latest assessment per customer (risk_profiles keeps history).
    "v_latest_risk_profile": """
        SELECT DISTINCT ON (customer_id)
               customer_id, assessed_at, risk_score, risk_level, horizon_years, liquidity_need
        FROM risk_profiles
        ORDER BY customer_id, assessed_at DESC
    """,
    # One row per position with valuation; all money maths happens here, in NUMERIC.
    "v_position_valuation": """
        SELECT a.customer_id,
               h.account_id,
               a.account_type,
               a.provider,
               a.status                                   AS account_status,
               h.instrument_id,
               i.symbol,
               i.instrument_name,
               i.asset_class,
               i.sector,
               i.risk_band,
               h.snapshot_date,
               i.price_as_of,
               h.quantity,
               h.avg_cost,
               i.last_price,
               h.quantity * h.avg_cost                    AS cost_basis,
               h.quantity * i.last_price                  AS market_value,
               h.quantity * (i.last_price - h.avg_cost)   AS unrealized_pnl
        FROM holdings_snapshot h
        JOIN accounts a    ON a.account_id = h.account_id
        JOIN instruments i ON i.instrument_id = h.instrument_id
    """,
    # AUM per customer at the latest snapshot date in the table.
    "v_customer_aum": """
        SELECT v.customer_id,
               v.snapshot_date,
               count(*)                 AS positions,
               sum(v.market_value)      AS market_value,
               sum(v.cost_basis)        AS cost_basis,
               sum(v.unrealized_pnl)    AS unrealized_pnl
        FROM v_position_valuation v
        WHERE v.snapshot_date = (SELECT max(snapshot_date) FROM holdings_snapshot)
        GROUP BY v.customer_id, v.snapshot_date
    """,
    # Settled BUY/SELL cash per calendar month. Positive net = money invested.
    "v_monthly_net_flows": """
        SELECT date_trunc('month', trade_date)::date                                  AS month,
               sum(amount) FILTER (WHERE transaction_type = 'BUY')                    AS buy_amount,
               sum(amount) FILTER (WHERE transaction_type = 'SELL')                   AS sell_amount,
               coalesce(sum(amount) FILTER (WHERE transaction_type = 'BUY'), 0)
             - coalesce(sum(amount) FILTER (WHERE transaction_type = 'SELL'), 0)      AS net_invested,
               count(*)                                                               AS trades
        FROM transactions
        WHERE status = 'SETTLED' AND transaction_type IN ('BUY', 'SELL')
        GROUP BY 1
    """,
    # Reconciliation / data-quality exceptions in one queryable place: rows the importer
    # refused (import_errors) plus logical inconsistencies in data that *was* loaded.
    "v_data_quality_exceptions": """
        SELECT 'IMPORT_' || e.severity          AS exception_type,
               e.error_code                     AS rule,
               b.kind                           AS entity,
               coalesce(e.raw_data ->> 'transaction_id',
                        e.raw_data ->> 'account_id' || '/' || (e.raw_data ->> 'instrument_id'),
                        '#' || e.line_number)   AS entity_ref,
               e.message                        AS detail,
               b.started_at                     AS detected_at
        FROM import_errors e
        JOIN import_batches b ON b.id = e.batch_id
        UNION ALL
        SELECT 'RECONCILIATION', 'TRADE_BEFORE_ACCOUNT_OPENED', 'TRANSACTIONS', t.transaction_id,
               'trade_date ' || t.trade_date || ' precedes account ' || a.account_id
                 || ' opened_at ' || a.opened_at,
               t.created_at
        FROM transactions t JOIN accounts a ON a.account_id = t.account_id
        WHERE t.trade_date < a.opened_at
        UNION ALL
        SELECT 'RECONCILIATION', 'POSITION_IN_INACTIVE_ACCOUNT', 'HOLDINGS',
               h.account_id || '/' || h.instrument_id,
               'holding in ' || a.status || ' account on ' || h.snapshot_date,
               h.created_at
        FROM holdings_snapshot h JOIN accounts a ON a.account_id = h.account_id
        WHERE a.status <> 'ACTIVE'
        UNION ALL
        SELECT 'RECONCILIATION', 'GOAL_OVERFUNDED', 'GOALS', g.goal_id,
               'funded ' || g.current_funded_amount || ' exceeds target ' || g.target_amount,
               g.updated_at
        FROM goals g WHERE g.current_funded_amount > g.target_amount
        UNION ALL
        SELECT 'RECONCILIATION', 'GOAL_OVERDUE', 'GOALS', g.goal_id,
               'target_date ' || g.target_date || ' passed while '
                 || round(100 * g.current_funded_amount / g.target_amount, 1) || '% funded',
               g.updated_at
        FROM goals g
        WHERE g.target_date < current_date AND g.current_funded_amount < g.target_amount
        UNION ALL
        SELECT 'RECONCILIATION', 'GOAL_NAME_TYPE_MISMATCH', 'GOALS', g.goal_id,
               'goal_name "' || g.goal_name || '" does not describe goal_type ' || g.goal_type,
               g.updated_at
        FROM goals g
        WHERE lower(g.goal_name) NOT LIKE '%' || lower(replace(g.goal_type, '_', ' ')) || '%'
    """,
}


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.add_column(
        "customers",
        sa.Column(
            "search_text",
            sa.Text(),
            sa.Computed(
                "lower(customer_id || ' ' || full_name || ' ' || email || ' ' || city)",
                persisted=True,
            ),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_customers_search_trgm",
        "customers",
        ["search_text"],
        postgresql_using="gin",
        postgresql_ops={"search_text": "gin_trgm_ops"},
    )
    for name, body in VIEWS.items():
        op.execute(f"CREATE VIEW {name} AS {body}")


def downgrade() -> None:
    for name in reversed(VIEWS):
        op.execute(f"DROP VIEW IF EXISTS {name}")
    op.drop_index("ix_customers_search_trgm", table_name="customers")
    op.drop_column("customers", "search_text")
    # pg_trgm is left installed: other objects may depend on it.
