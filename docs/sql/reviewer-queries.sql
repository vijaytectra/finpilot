-- =============================================================================================
-- FinPilot - reviewer SQL tasks (assignment section 6.1)
--
-- Run against the seeded database, read-only:
--   docker exec -i finpilot-db-1 psql -U finpilot -d finpilot -X < docs/sql/reviewer-queries.sql
--
-- Every query only reads. Results pasted under each query were captured on 2026-10-06 against
-- the database seeded from data/raw/*.csv (latest holdings snapshot 2026-09-18). Money is
-- INR, computed in NUMERIC and rounded only for display.
--
-- Views used (migration 0002): v_position_valuation, v_customer_aum, v_monthly_net_flows,
-- v_latest_risk_profile, v_data_quality_exceptions.
-- =============================================================================================


-- ---------------------------------------------------------------------------------------------
-- Q1. Top 10 customers by current snapshot AUM
--     v_customer_aum = sum(quantity * last_price) per customer at max(snapshot_date).
--     Ties broken by customer_id so the order is deterministic.
-- ---------------------------------------------------------------------------------------------
SELECT c.customer_id,
       c.full_name,
       c.segment,
       a.positions,
       round(a.market_value, 2)                                         AS aum,
       round(100 * a.market_value / sum(a.market_value) OVER (), 2)     AS share_of_firm_pct
FROM v_customer_aum a
JOIN customers c ON c.customer_id = a.customer_id
ORDER BY a.market_value DESC, c.customer_id
LIMIT 10;
-- 10 rows. First three:
--  customer_id | full_name       | segment | positions |    aum     | share_of_firm_pct
--  C0026       | Rohan Kulkarni  | Mass    |        19 | 1953574.59 |              3.70
--  C0100       | Ananya Malhotra | Mass    |        28 | 1853671.76 |              3.51
--  C0008       | Kabir Singh     | Mass    |        17 | 1525930.15 |              2.89
-- (firm total: 113 of 120 customers hold positions; AUM 52,754,963.60)


-- ---------------------------------------------------------------------------------------------
-- Q2a. Asset-class allocation for ONE customer (C0026)
-- ---------------------------------------------------------------------------------------------
SELECT asset_class,
       count(*)                                                         AS positions,
       round(sum(market_value), 2)                                      AS market_value,
       round(100 * sum(market_value) / sum(sum(market_value)) OVER (), 2) AS weight_pct
FROM v_position_valuation
WHERE customer_id = 'C0026'
  AND snapshot_date = (SELECT max(snapshot_date) FROM holdings_snapshot)
GROUP BY asset_class
ORDER BY market_value DESC;
-- 5 rows:
--  EQUITY      | 12 | 1804340.02 | 92.36
--  ETF         |  1 |   81187.45 |  4.16
--  MUTUAL_FUND |  3 |   31171.97 |  1.60
--  BOND        |  2 |   28724.80 |  1.47
--  REIT        |  1 |    8150.36 |  0.42


-- ---------------------------------------------------------------------------------------------
-- Q2b. Asset-class allocation for the WHOLE dataset
-- ---------------------------------------------------------------------------------------------
SELECT asset_class,
       count(*)                                                         AS positions,
       count(DISTINCT customer_id)                                      AS customers,
       round(sum(market_value), 2)                                      AS market_value,
       round(100 * sum(market_value) / sum(sum(market_value)) OVER (), 2) AS weight_pct
FROM v_position_valuation
WHERE snapshot_date = (SELECT max(snapshot_date) FROM holdings_snapshot)
GROUP BY asset_class
ORDER BY market_value DESC;
-- 6 rows (asset_class | positions | customers | market_value | weight_pct):
--  EQUITY      | 408 | 108 | 44180166.20 | 83.75
--  ETF         | 136 |  83 |  4033879.90 |  7.65
--  MUTUAL_FUND | 201 |  87 |  1610811.88 |  3.05
--  BOND        | 133 |  80 |  1523032.00 |  2.89
--  REIT        |  51 |  40 |   868390.46 |  1.65
--  GSEC        |  53 |  42 |   538683.16 |  1.02


-- ---------------------------------------------------------------------------------------------
-- Q3. Monthly BUY/SELL net cash flow for the last 12 months
--     SETTLED trades only (PENDING has not moved cash, REVERSED was undone). net = BUY - SELL,
--     so a positive number is money invested. generate_series emits empty months as zero
--     rows. The date bound is applied BEFORE aggregation so only ~12 months of the ledger
--     are read (see docs/performance/query-plans.md, D1 vs D2).
-- ---------------------------------------------------------------------------------------------
WITH months AS (
    SELECT generate_series(date_trunc('month', current_date) - interval '11 months',
                           date_trunc('month', current_date),
                           interval '1 month')::date AS month
), flows AS (
    SELECT date_trunc('month', trade_date)::date                     AS month,
           sum(amount) FILTER (WHERE transaction_type = 'BUY')       AS buy_amount,
           sum(amount) FILTER (WHERE transaction_type = 'SELL')      AS sell_amount,
           count(*)                                                  AS trades
    FROM transactions
    WHERE status = 'SETTLED'
      AND transaction_type IN ('BUY', 'SELL')
      AND trade_date >= date_trunc('month', current_date) - interval '11 months'
      AND trade_date <  date_trunc('month', current_date) + interval '1 month'
    GROUP BY 1
)
SELECT m.month,
       coalesce(f.buy_amount, 0)                                    AS buy_amount,
       coalesce(f.sell_amount, 0)                                   AS sell_amount,
       coalesce(f.buy_amount, 0) - coalesce(f.sell_amount, 0)       AS net_invested,
       coalesce(f.trades, 0)                                        AS trades
FROM months m
LEFT JOIN flows f ON f.month = m.month
ORDER BY m.month;
-- 12 rows (run date 2026-10-06, so the window is 2025-11 .. 2026-10). First and last:
--  2025-11-01 | 2721171.97 | 1930629.15 |  790542.82 | 178
--  2025-12-01 | 2301830.40 | 1232961.29 | 1068869.11 | 156
--  ...
--  2026-09-01 | 1932513.65 | 1139774.29 |  792739.36 | 122
--  2026-10-01 |          0 |          0 |          0 |   0   <- no trades yet: zero row, not a gap


-- ---------------------------------------------------------------------------------------------
-- Q4. Top instruments by number of DISTINCT holders (customers, not accounts: one customer
--     holding the same instrument in two accounts counts once)
-- ---------------------------------------------------------------------------------------------
SELECT i.instrument_id,
       i.symbol,
       i.asset_class,
       count(DISTINCT a.customer_id)                                    AS holders,
       count(*)                                                         AS positions
FROM holdings_snapshot h
JOIN accounts a    ON a.account_id = h.account_id
JOIN instruments i ON i.instrument_id = h.instrument_id
WHERE h.snapshot_date = (SELECT max(snapshot_date) FROM holdings_snapshot)
GROUP BY i.instrument_id, i.symbol, i.asset_class
ORDER BY holders DESC, i.instrument_id
LIMIT 10;
-- 10 rows. First five:
--  I0049 | MU005 | MUTUAL_FUND | 26 | 26
--  I0006 | EQ006 | EQUITY      | 17 | 18   <- 18 positions, 17 holders: one customer holds it twice
--  I0013 | EQ013 | EQUITY      | 17 | 17
--  I0029 | EQ029 | EQUITY      | 17 | 17
--  I0080 | GS004 | GSEC        | 17 | 17


-- ---------------------------------------------------------------------------------------------
-- Q5. Customers with HIGH-priority goals below 25 % funded
--     Compared as funded < 0.25 * target (no division, no rounding at the boundary).
-- ---------------------------------------------------------------------------------------------
SELECT g.customer_id,
       c.full_name,
       g.goal_id,
       g.goal_type,
       g.target_amount,
       g.current_funded_amount,
       round(100 * g.current_funded_amount / g.target_amount, 2)        AS funded_pct,
       g.target_date
FROM goals g
JOIN customers c ON c.customer_id = g.customer_id
WHERE g.priority = 'HIGH'
  AND g.current_funded_amount < 0.25 * g.target_amount
ORDER BY funded_pct, g.goal_id;
-- 12 rows. First three:
--  C0055 | Tara Bose   | G00083 | TRAVEL        | 3785626.39 | 126009.16 |  3.33 | 2038-06-28
--  C0018 | Aditi Reddy | G00025 | RETIREMENT    | 8973633.03 | 452464.04 |  5.04 | 2040-10-27
--  C0118 | Vivaan Gupta| G00171 | HOME_PURCHASE | 6330794.34 | 533847.57 |  8.43 | 2043-05-23


-- ---------------------------------------------------------------------------------------------
-- Q6. Data-quality / reconciliation exceptions
-- ---------------------------------------------------------------------------------------------

-- Q6a. Summary by rule (the same numbers the /reports/overview endpoint returns).
--      count(DISTINCT entity_ref) so that re-importing a file does not inflate the counts.
SELECT exception_type, rule, entity, count(DISTINCT entity_ref) AS exceptions
FROM v_data_quality_exceptions
GROUP BY exception_type, rule, entity
ORDER BY exception_type, exceptions DESC;
-- 7 rows:
--  IMPORT_REJECTED | DUPLICATE_IN_FILE           | HOLDINGS     |    3
--  IMPORT_REJECTED | DUPLICATE_IN_FILE           | TRANSACTIONS |    1
--  IMPORT_REJECTED | FUTURE_TRADE_DATE           | TRANSACTIONS |    1
--  IMPORT_REJECTED | UNKNOWN_INSTRUMENT          | TRANSACTIONS |    1
--  IMPORT_REJECTED | NEGATIVE_AMOUNT             | TRANSACTIONS |    1
--  RECONCILIATION  | TRADE_BEFORE_ACCOUNT_OPENED | TRANSACTIONS | 1069
--  RECONCILIATION  | GOAL_NAME_TYPE_MISMATCH     | GOALS        |  149
-- (POSITION_IN_INACTIVE_ACCOUNT, GOAL_OVERFUNDED and GOAL_OVERDUE rules exist but match 0 rows.)

-- Q6b. Rows the importer rejected, from the FIRST batch of each kind that recorded errors
--      (the initial seed). Shows duplicate positions, duplicate transaction ids and invalid
--      references with the physical file line (header = line 1).
WITH first_batch AS (
    SELECT DISTINCT ON (b.kind) b.id, b.kind, b.filename
    FROM import_batches b
    WHERE EXISTS (SELECT 1 FROM import_errors e WHERE e.batch_id = b.id)
    ORDER BY b.kind, b.started_at
)
SELECT fb.kind, fb.filename, e.line_number, e.error_code, e.field, e.message
FROM first_batch fb
JOIN import_errors e ON e.batch_id = fb.id
ORDER BY fb.kind, e.line_number;
-- 7 rows:
--  HOLDINGS     | holdings_snapshot.csv |  984 | DUPLICATE_IN_FILE  | key 2026-09-18/A00147/I0049; first seen on line 836
--  HOLDINGS     | holdings_snapshot.csv |  985 | DUPLICATE_IN_FILE  | key 2026-09-18/A00145/I0036; first seen on line 830
--  HOLDINGS     | holdings_snapshot.csv |  986 | DUPLICATE_IN_FILE  | key 2026-09-18/A00146/I0010; first seen on line 833
--  TRANSACTIONS | transactions.csv      | 4552 | DUPLICATE_IN_FILE  | T0000026 already appears on line 27
--  TRANSACTIONS | transactions.csv      | 4553 | UNKNOWN_INSTRUMENT | instrument_id I9999 does not exist
--  TRANSACTIONS | transactions.csv      | 4554 | NEGATIVE_AMOUNT    | amount -75.00 is negative (FEE)
--  TRANSACTIONS | transactions.csv      | 4555 | FUTURE_TRADE_DATE  | trade_date 2027-01-05 after business date 2026-10-06

-- Q6c. Duplicate transaction ids: the loaded table cannot contain any (primary key); the
--      duplicate in the file was quarantined. Both facts in one row.
SELECT (SELECT count(*) FROM (SELECT transaction_id FROM transactions
                              GROUP BY transaction_id HAVING count(*) > 1) d) AS duplicate_ids_loaded,
       (SELECT count(DISTINCT e.raw_data ->> 'transaction_id')
          FROM import_errors e WHERE e.error_code = 'DUPLICATE_IN_FILE'
           AND e.raw_data ? 'transaction_id')                                 AS duplicate_ids_quarantined;
--  duplicate_ids_loaded | duplicate_ids_quarantined
--                     0 |                         1

-- Q6d. Loaded trades that pre-date their account's opened_at (kept, flagged), by account
--      status, plus trades on accounts that are not ACTIVE.
SELECT a.status                                                         AS account_status,
       count(*)                                                         AS trades,
       count(*) FILTER (WHERE t.trade_date < a.opened_at)               AS before_account_opened,
       count(DISTINCT t.account_id)                                     AS accounts
FROM transactions t
JOIN accounts a ON a.account_id = t.account_id
GROUP BY a.status
ORDER BY a.status;
--  ACTIVE  | 4239 | 1053 | 155
--  CLOSED  |  114 |    9 |   5
--  DORMANT |  197 |    7 |   7
-- => 1,069 trades before account opening; 311 loaded trades on CLOSED/DORMANT accounts
--    (313 in the raw file; 2 of those are among the 4 rejected rows).

-- Q6e. Holdings vs ledger reconciliation: does each snapshot position equal the settled net
--      BUY - SELL quantity for the same account/instrument? (It does not, for any position;
--      the portfolio is therefore valued from the snapshot, and the ledger shown as history.)
WITH ledger AS (
    SELECT account_id, instrument_id,
           sum(CASE transaction_type WHEN 'BUY' THEN quantity ELSE -quantity END) AS net_qty
    FROM transactions
    WHERE status = 'SETTLED' AND transaction_type IN ('BUY', 'SELL')
    GROUP BY account_id, instrument_id
)
SELECT (SELECT count(*) FROM holdings_snapshot)                                AS positions,
       (SELECT count(*) FROM holdings_snapshot h
          JOIN ledger l USING (account_id, instrument_id))                     AS positions_with_trades,
       (SELECT count(*) FROM holdings_snapshot h
          JOIN ledger l USING (account_id, instrument_id)
         WHERE l.net_qty = h.quantity)                                         AS positions_matching_ledger,
       (SELECT count(*) FROM ledger)                                           AS ledger_pairs,
       (SELECT count(*) FROM ledger WHERE net_qty < 0)                         AS ledger_pairs_net_short;
--  positions | positions_with_trades | positions_matching_ledger | ledger_pairs | ledger_pairs_net_short
--        982 |                   225 |                         0 |         3068 |                   1187


-- ---------------------------------------------------------------------------------------------
-- Q7. "Show-off": each customer's largest position, its share of that customer's portfolio,
--     and the customer's concentration (HHI) - window functions over the valuation view.
--     HHI = sum of squared weights (0..1); > 0.25 is conventionally "highly concentrated".
-- ---------------------------------------------------------------------------------------------
WITH pos AS (
    SELECT customer_id, symbol, asset_class, market_value,
           market_value / sum(market_value) OVER (PARTITION BY customer_id)      AS weight,
           row_number() OVER (PARTITION BY customer_id
                              ORDER BY market_value DESC, instrument_id, account_id) AS rn
    FROM v_position_valuation
    WHERE snapshot_date = (SELECT max(snapshot_date) FROM holdings_snapshot)
)
SELECT customer_id,
       max(symbol)       FILTER (WHERE rn = 1)                          AS largest_position,
       max(asset_class)  FILTER (WHERE rn = 1)                          AS asset_class,
       round(max(market_value) FILTER (WHERE rn = 1), 2)                AS largest_value,
       round(100 * max(weight) FILTER (WHERE rn = 1), 2)                AS largest_weight_pct,
       count(*)                                                         AS positions,
       round(sum(weight * weight), 4)                                   AS hhi
FROM pos
GROUP BY customer_id
ORDER BY largest_weight_pct DESC, customer_id
LIMIT 10;
-- 10 rows. First three:
--  C0086 | EQ019 | EQUITY | 395633.21 | 96.89 | 3 | 0.9396
--  C0080 | EQ015 | EQUITY | 424821.58 | 95.12 | 3 | 0.9064
--  C0067 | EQ011 | EQUITY | 203310.56 | 85.89 | 6 | 0.7479
