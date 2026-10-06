# Query plans: `EXPLAIN (ANALYZE, BUFFERS)` evidence

This document shows what the indexes in migration `0001`/`0002` actually buy, and where the
current queries stop scaling. Every plan below was produced on 2026-10-06 by running the
**exact SQL the API issues** (copied from `apps/api/app/repositories/*.py`, bind parameters
replaced by literals).

## 1. Method

| Item | Value |
|---|---|
| Server | PostgreSQL 16.14 (`postgres:16-alpine`), the dev container `finpilot-db-1` |
| Settings | defaults: `shared_buffers=128MB`, `work_mem=4MB`, `max_parallel_workers_per_gather=2`, `random_page_cost=4` |
| Schema | `alembic upgrade head` (migrations 0001 + 0002) into a throw-away database `finpilot_perf`, dropped afterwards |
| Data | [`perf-dataset.sql`](perf-dataset.sql): deterministic `generate_series` load, then `VACUUM ANALYZE` |
| Timing | each query run twice; the **second** (warm) run is quoted unless stated. `read=` buffers come from the OS page cache, not disk |

Why a separate database: the supplied dataset (120 customers, 4,550 transactions) fits in a
few hundred 8 kB pages, so every plan is sub-3 ms and the planner rightly prefers sequential
scans for small tables. On the seeded `finpilot` database the ledger query for `C0026` takes
**1.4 ms** and the customer search **3.4 ms**. Index value only becomes visible at volume.

Scaled dataset (`finpilot_perf`):

| Table | Rows | Heap | Total incl. indexes |
|---|---:|---:|---:|
| customers | 100,000 | 19 MB | 45 MB |
| accounts | 150,000 | 14 MB | 22 MB |
| instruments | 500 | 56 kB | 160 kB |
| holdings_snapshot | 300,000 | 22 MB | 42 MB |
| transactions | 3,000,000 | 322 MB | 685 MB |

Shape: customer `C0nnnnn` owns account `A0nnnnn`, and customers 1–50,000 also own
`A01nnnnn`; ~20 transactions per account. Customer **`C012345`** (2 accounts, 39
transactions) is the "typical" case. Customer **`C000001`** (2 accounts, **50,040**
transactions) is a deliberately heavy customer to expose pagination behaviour. Transactions
are inserted in an order unrelated to account or date, like an append-only ledger.

## 2. Summary

| # | Query (API endpoint) | Without index / current SQL | With index / rewrite | Buffers (before -> after) |
|---|---|---:|---:|---:|
| A1 | Ledger page 1, typical customer (`GET /customers/{id}/transactions`) | 362 ms | **1.3 ms** | 41,521 -> 168 |
| A2 | Ledger `count(*)`, typical customer | 280 ms | **0.20 ms** | 41,340 -> 16 |
| A6 | Ledger page 1, one account + type filter, heavy customer | 130 ms | **0.84 ms** | 8,571 -> 107 |
| A3 | Ledger page 1, heavy customer (2 accounts, 50k rows) | 348 ms | 129 ms | 191,524 -> 151,848 |
| A3' | ... rewritten as per-account `LATERAL` top-N | 129 ms | **0.45 ms** | 151,848 -> 68 |
| A4 | Ledger page 2,000 (`OFFSET 49975`), heavy customer | 314 ms | 293 ms (5 MB sort spill) | — |
| A4' | ... rewritten as keyset cursor | 293 ms | **0.64 ms** | -> 67 |
| B1 | Customer search predicate `search_text LIKE '%nair4217%'` | 29 ms (seq scan) | **0.21 ms** (GIN trigram) | 2,439 -> 17 |
| B2 | Full search query as shipped (incl. AUM join) | 572 ms | 530 ms | dominated by `v_customer_aum` |
| B4 | ... rewritten: page customers first, AUM via `LATERAL` | 530 ms | **0.62 ms** | 4,977 + temp -> 48 |
| C1 | Portfolio `GROUPING SETS` (`GET /customers/{id}/portfolio`) | 18 ms (no `ix_accounts_customer_id`) | **0.39 ms** | 1,874 -> 27 |
| D1 | Monthly net flows, last 12 months (`GET /reports/overview`) | 1,276 ms (full ledger) | 414 ms (date bound pushed down) | 41,273 -> 25,693 |

Reading guide: A1, A2, A6, B1 and C1 are the "index before/after" proofs requested. A3/A4, B2
and D1 are the honest part: the indexes are necessary but not sufficient, and each has a
concrete, measured fix that is listed on the roadmap (report §10) but **not yet applied to the
application code**.

## 3. (a) Customer transaction ledger and `ix_transactions_account_date`

Index (migration 0001):

```sql
CREATE INDEX ix_transactions_account_date
    ON transactions (account_id, trade_date DESC, transaction_id DESC);
```

Query as issued by `TransactionRepository.page()` (default sort `-trade_date`, page 1 of 25):

```sql
SELECT t.transaction_id, t.account_id, t.instrument_id, i.symbol, i.instrument_name, i.asset_class,
       t.transaction_type, t.trade_date, t.quantity, t.price, t.amount, t.status
FROM transactions t
JOIN instruments i ON i.instrument_id = t.instrument_id
WHERE t.account_id IN (SELECT account_id FROM accounts WHERE customer_id = 'C012345')
ORDER BY t.trade_date DESC, t.transaction_id DESC
LIMIT 25 OFFSET 0;
```

### A1 — without the index (dropped in `finpilot_perf`)

```
Limit  (actual time=354.873..361.950 rows=25 loops=1)
  Buffers: shared hit=13724 read=27797
  ->  Gather Merge  (Workers Launched: 2)
        ->  Sort  Sort Key: t.trade_date DESC, t.transaction_id DESC   Sort Method: quicksort
              ->  Nested Loop
                    ->  Hash Join  Hash Cond: (t.account_id = accounts.account_id)
                          ->  Parallel Seq Scan on transactions t  (actual rows=1000000 loops=3)
                          ->  Hash
                                ->  Index Scan using ix_accounts_customer_id on accounts
                                      Index Cond: (customer_id = 'C012345')
                    ->  Index Scan using pk_instruments on instruments i  (loops=39)
Execution Time: 362.211 ms
```

There is no other index whose leading column is `account_id`, so finding 39 rows means
reading all 3,000,000 (41,521 pages, ~325 MB) with three processes.

### A1 — with the index

```
Limit  (actual time=0.724..0.731 rows=25 loops=1)
  Buffers: shared hit=168
  ->  Sort  Sort Key: t.trade_date DESC, t.transaction_id DESC   Sort Method: quicksort  Memory: 30kB
        ->  Nested Loop
              ->  Nested Loop
                    ->  Index Scan using ix_accounts_customer_id on accounts  (rows=2)
                    ->  Bitmap Heap Scan on transactions t  (actual rows=20 loops=2)
                          ->  Bitmap Index Scan on ix_transactions_account_date
                                Index Cond: (account_id = accounts.account_id)
              ->  Index Scan using pk_instruments on instruments i  (loops=39)
Execution Time: 1.321 ms
```

**362 ms -> 1.3 ms, 41,521 -> 168 buffers.** The two accounts are resolved through
`ix_accounts_customer_id`, then each account's rows through the leading column of the
composite index.

### A2 — the `count(*)` the endpoint runs for pagination metadata

| | Plan | Time | Buffers |
|---|---|---:|---:|
| without | Parallel Seq Scan on transactions + Hash Join | 280.4 ms | 41,340 |
| with | Nested Loop -> **Index Only Scan** using ix_transactions_account_date (`Heap Fetches: 0`) | 0.20 ms | 16 |

The count never touches the heap: the visibility map is all-visible after `VACUUM`, and
`account_id` is in the index.

### A6 — where the trailing `trade_date DESC, transaction_id DESC` columns pay off

When the user filters to one account (`account_id=A0000001&transaction_type=BUY&transaction_type=SELL`),
the index delivers rows already in the requested order and the `LIMIT` stops the scan after
25 matches — no sort node at all:

```
Limit  (actual time=0.388..0.493 rows=25 loops=1)
  Buffers: shared hit=107
  ->  Nested Loop Semi Join
        ->  Nested Loop
              ->  Index Scan using ix_transactions_account_date on transactions t  (actual rows=25)
                    Index Cond: (account_id = 'A0000001')
                    Filter: (transaction_type = ANY ('{BUY,SELL}'))
              ->  Memoize -> Index Scan using pk_instruments on instruments i
        ->  Materialize -> Index Scan using pk_accounts on accounts   Filter: (customer_id = 'C000001')
Execution Time: 0.840 ms
```

Without the index the planner walks `ix_transactions_trade_date` backwards and filters 8,343
rows of other accounts (130 ms). The `transaction_id DESC` tiebreaker in the index is what makes
the API's deterministic order (`ORDER BY trade_date DESC, transaction_id DESC`) index-ordered.

### A3 / A4 — remaining bottleneck: many rows across several accounts, and deep `OFFSET`

For the heavy customer (2 accounts, 50,040 rows) the index helps less:

```
A3 (page 1)                                         A4 (page 2,000: OFFSET 49975)
Limit (actual time=129.2 rows=25)                   Limit (actual time=291.2 rows=25)
  Buffers: shared hit=151848                          Buffers: shared hit=151848, temp read=644 written=645
  -> Sort  top-N heapsort                             -> Sort  Sort Method: external merge  Disk: 5152kB
     -> Nested Loop  (rows=50040)                        -> Nested Loop (rows=50040)
        -> Nested Loop                                      -> ... Bitmap Index Scan on ix_transactions_account_date
           -> Bitmap Heap Scan on transactions (25020 x 2)  -> Index Scan using pk_instruments (loops=50040)
        -> Index Scan using pk_instruments (loops=50040)
Execution Time: 129.456 ms                          Execution Time: 292.699 ms
```

Three distinct causes, all visible in the plan:

1. **`IN (subquery)` over two accounts loses index order.** Each account's slice is ordered,
   but PostgreSQL 16 does not merge two index ranges for an `IN` list here, so it fetches all
   50,040 rows and sorts.
2. **The instruments join runs before the `LIMIT`**: 50,040 `pk_instruments` probes (150,120 of
   the 151,848 buffer hits) to return 25 rows.
3. **`OFFSET` is linear**: page 2,000 must produce and discard 49,975 sorted rows; with
   `work_mem=4MB` the sort spills 5 MB to disk.

Measured fixes (not yet in the application code; see report §10):

**A3' — per-account top-N with `LATERAL`, join instruments after the limit** (0.45 ms, 68 buffers):

```sql
SELECT t.*, i.symbol, i.instrument_name, i.asset_class
FROM (
    SELECT x.*
    FROM accounts a
    CROSS JOIN LATERAL (
        SELECT * FROM transactions t
        WHERE t.account_id = a.account_id
        ORDER BY t.trade_date DESC, t.transaction_id DESC
        LIMIT 25                                   -- page_size (+ offset, if offset paging is kept)
    ) x
    WHERE a.customer_id = 'C000001'
    ORDER BY x.trade_date DESC, x.transaction_id DESC
    LIMIT 25
) t
JOIN instruments i ON i.instrument_id = t.instrument_id
ORDER BY t.trade_date DESC, t.transaction_id DESC;
```
```
Sort (actual time=0.318..0.322 rows=25)  Buffers: shared hit=68
  -> Hash Join -> ... -> Limit -> Sort (rows=50)
       -> Nested Loop
            -> Index Scan using ix_accounts_customer_id on accounts a (rows=2)
            -> Limit -> Index Scan using ix_transactions_account_date on transactions t_1 (rows=25 loops=2)
Execution Time: 0.450 ms
```

**A4' — keyset ("seek") pagination**: the client sends the last `(trade_date, transaction_id)`
it saw instead of a page number; the same LATERAL query adds
`AND (t.trade_date, t.transaction_id) < ('2021-01-03', 'T00038424')`, which PostgreSQL
turns into an index condition:

```
Index Scan using ix_transactions_account_date on transactions t_1 (actual rows=24 loops=2)
  Index Cond: ((account_id = a.account_id) AND (ROW(trade_date, transaction_id) < ROW('2021-01-03', 'T00038424')))
Execution Time: 0.644 ms        (vs 292.7 ms for OFFSET 49975)
```

Keyset cost is independent of page depth; the trade-off is that the UI can offer
"next/previous" but not "jump to page N", and `count(*)` (A2/A5: 14.6 ms for 50k rows,
index-only) becomes optional.

## 4. (b) Customer search and `ix_customers_search_trgm`

Index (migration 0002), on a stored generated column so the expression is computed once per
write, not per search:

```sql
ALTER TABLE customers ADD COLUMN search_text text
    GENERATED ALWAYS AS (lower(customer_id || ' ' || full_name || ' ' || email || ' ' || city)) STORED;
CREATE INDEX ix_customers_search_trgm ON customers USING gin (search_text gin_trgm_ops);
```

The repository binds `like_pattern(term)` = `'%' || escaped(lower(term)) || '%'`, so a leading
wildcard is unavoidable; a B-tree cannot serve it, a trigram GIN index can.

### B1 — the predicate in isolation

| term | matches | without index | with index |
|---|---:|---|---|
| `nair4217` | 1 | Seq Scan, 99,999 rows removed, **29.1 ms**, 2,439 buffers | Bitmap Index Scan on ix_customers_search_trgm, **0.21 ms**, 17 buffers |
| `zoya` | 2,500 | Seq Scan, 17.4 ms, 2,439 buffers | Bitmap Index Scan + 2,439 heap blocks, 3.4 ms, 2,446 buffers |

```
Bitmap Heap Scan on customers c  (actual time=0.136..0.136 rows=1 loops=1)
  Recheck Cond: (search_text ~~ '%nair4217%'::text)
  Heap Blocks: exact=1
  Buffers: shared hit=17
  ->  Bitmap Index Scan on ix_customers_search_trgm  (actual time=0.131..0.131 rows=1 loops=1)
        Index Cond: (search_text ~~ '%nair4217%'::text)
        Buffers: shared hit=16
Execution Time: 0.209 ms
```

The index is most valuable for selective terms (ids, e-mail fragments, surnames); for a term
matching 2.5 % of rows the heap visits dominate and the gain is ~5x. Terms shorter than three
characters produce no trigrams and fall back to a full GIN index scan; acceptable for an
internal tool (a minimum search length in the UI would remove the case).

### B2 — the full search query as shipped: the index is not the bottleneck

`CustomerRepository.search()` joins every customer to `v_customer_aum` (for the AUM column and
the `aum` sort) and to an account-count subquery. Both are aggregated **for the whole table**
before the join, regardless of the search term:

```
Limit  (actual time=523.258..528.324 rows=1 loops=1)
  Buffers: shared hit=4977, temp read=1047 written=1328
  ->  WindowAgg
        ->  Merge Left Join  Merge Cond: (c.customer_id = a.customer_id)
              ->  Merge Left Join
                    ->  Sort -> Bitmap Heap Scan on customers c
                          ->  Bitmap Index Scan on ix_customers_search_trgm   (rows=1)   <- 0.4 ms
                    ->  GroupAggregate -> Index Only Scan using ix_accounts_customer_id (rows=84359)
              ->  Materialize
                    ->  Finalize GroupAggregate  Group Key: a.customer_id     (rows=42180)
                          ->  Gather Merge -> Partial GroupAggregate
                                ->  Sort  Sort Method: external merge  Disk: 5320kB
                                      ->  Hash Join (holdings x accounts x instruments, rows=150000 x 2)
Execution Time: 530.126 ms          (572 ms with the trigram index dropped)
```

The trigram index finds the one matching customer in 0.4 ms; the other 529 ms is valuing all
300,000 positions. On the supplied data this is 3.4 ms and invisible; at 100k customers it is
the dominant cost of the customer list. The unfiltered first page (no search term) is worse:
**1,147 ms**, because the window `count(*) OVER ()` also forces the full 100k-row join.

**B4 — measured fix: page first, value only the page** (0.62 ms, 48 buffers):

```sql
WITH page AS (
    SELECT c.customer_id, c.full_name, c.email, c.city, c.state, c.kyc_status, c.segment,
           count(*) OVER () AS total
    FROM customers c
    WHERE c.search_text LIKE '%nair4217%'
    ORDER BY c.customer_id
    LIMIT 20 OFFSET 0
)
SELECT p.*, x.accounts, coalesce(x.aum, 0) AS aum
FROM page p
CROSS JOIN LATERAL (
    SELECT count(DISTINCT a.account_id) AS accounts, sum(h.quantity * i.last_price) AS aum
    FROM accounts a
    LEFT JOIN holdings_snapshot h ON h.account_id = a.account_id
         AND h.snapshot_date = (SELECT max(snapshot_date) FROM holdings_snapshot)
    LEFT JOIN instruments i ON i.instrument_id = h.instrument_id
    WHERE a.customer_id = p.customer_id
) x
ORDER BY p.customer_id;
```

This works for every sort except `aum`/`-aum`, which inherently needs every customer's AUM;
that sort is served properly by a **materialized `customer_aum`** refreshed after each holdings
load (`REFRESH MATERIALIZED VIEW CONCURRENTLY` with a unique index on `customer_id`), which
also makes the unfiltered list an index scan. Both are on the roadmap.

## 5. (c) Portfolio valuation: one `GROUPING SETS` pass

`PortfolioRepository.aggregates()` returns account totals, asset-class totals and the grand
total in a single statement over `v_position_valuation`:

```sql
SELECT CASE WHEN grouping(account_id) = 0 THEN 'account'
            WHEN grouping(asset_class) = 0 THEN 'asset_class' ELSE 'total' END AS level,
       account_id, asset_class, count(*) AS positions,
       sum(market_value) AS market_value, sum(cost_basis) AS cost_basis,
       sum(unrealized_pnl) AS unrealized_pnl,
       max(price_as_of) AS price_as_of, min(price_as_of) AS oldest_price_as_of
FROM v_position_valuation
WHERE customer_id = 'C012345' AND snapshot_date = DATE '2026-09-18'
GROUP BY GROUPING SETS ((account_id), (asset_class), ());
```

```
MixedAggregate  (actual time=0.185..0.194 rows=5 loops=1)
  Hash Key: h.account_id
  Hash Key: i.asset_class
  Group Key: ()
  Buffers: shared hit=27
  ->  Nested Loop  (rows=4)
        ->  Nested Loop
              ->  Index Scan using ix_accounts_customer_id on accounts a  (rows=2)
                    Index Cond: (customer_id = 'C012345')
              ->  Index Scan using pk_holdings_snapshot on holdings_snapshot h  (rows=2 loops=2)
                    Index Cond: ((snapshot_date = '2026-09-18') AND (account_id = a.account_id))
        ->  Index Scan using pk_instruments on instruments i  (loops=4)
Execution Time: 0.392 ms
```

What to notice:

* The view is **inlined**: the `customer_id` predicate is pushed through `v_position_valuation`
  into an index scan on `accounts`, so defining valuation as a view costs nothing per request.
* The composite PK `(snapshot_date, account_id, instrument_id)` doubles as the access path for
  "positions of account X on date D" — no extra index needed.
* `MixedAggregate` computes the three grouping sets in **one pass** over 4 rows (hash for two
  sets, plain for the grand total). The alternative — three queries or summing in Python —
  would triple round trips or move money arithmetic out of `NUMERIC`.
* Without `ix_accounts_customer_id` (dropped inside a rolled-back transaction) the plan is
  identical except a `Seq Scan on accounts` removing 149,998 rows: **18.1 ms, 1,874 buffers**
  vs 0.39 ms, 27 buffers.

The sibling `positions()` query uses the same access path plus a `sum(...) OVER ()` window for
each position's weight.

## 6. (d) Monthly net flows report

`ReportRepository.monthly_net_flows()` left-joins 12 generated months to `v_monthly_net_flows`.
The join condition on the month does **not** push into the view's `GROUP BY`, so every call
aggregates the entire settled-trade history:

```
D1  Merge Left Join  (actual time=1267.897..1275.494 rows=12 loops=1)
      Buffers: shared hit=6672 read=34601
      ->  Finalize GroupAggregate  (rows=69 months)
            ->  Gather Merge -> Sort -> Partial HashAggregate
                  ->  Parallel Seq Scan on transactions  (actual rows=650000 loops=3)
                        Filter: (transaction_type = ANY ('{BUY,SELL}') AND status = 'SETTLED')
    Execution Time: 1275.901 ms
```

Applying the date bound inside the aggregate (`AND trade_date >= date_trunc('month', current_date) - interval '11 months'`,
the form used in `docs/sql/reviewer-queries.sql` Q3) lets `ix_transactions_trade_date` select
~15 % of the ledger:

```
D2  ->  Parallel Bitmap Heap Scan on transactions  (actual rows=101440 loops=3)
          Recheck Cond: (trade_date >= (date_trunc('month', CURRENT_DATE) - '11 mons'))
          ->  Bitmap Index Scan on ix_transactions_trade_date  (rows=466500)
    Execution Time: 413.665 ms
```

1,276 ms -> 414 ms. It is still a bitmap scan over ~466k rows because the scaled data spreads
5.7 years of trades evenly; the durable fix for a dashboard figure that changes once per
import is a small monthly summary (materialized view or a table maintained by the import
merge), which turns the report into a 12-row read.

## 7. Conclusions for the design

1. **Indexes are chosen per query, not per column.** Each index in the schema maps to a query
   above: `ix_transactions_account_date` (ledger page, count, account filter),
   `ix_customers_search_trgm` (search), `ix_accounts_customer_id` (every customer-scoped
   read), `pk_holdings_snapshot` (portfolio), `ix_transactions_trade_date` (date-bounded
   reports). `ix_transactions_instrument_id` and `ix_holdings_snapshot_instrument_id` exist
   for FK-side lookups (instrument filter, holder counts) and to keep `ON DELETE RESTRICT`
   checks on `instruments` from scanning.
2. **At the supplied volume every endpoint is < 5 ms**; the measured limits only appear at
   roughly 100x-1000x the data.
3. **Next steps, in order of measured payoff:** (i) page-first customer list (B4) and a
   materialized `customer_aum`; (ii) keyset pagination + per-account `LATERAL` for the ledger
   (A3'/A4'); (iii) a monthly-flow summary table; (iv) partition `transactions` by
   `trade_date` range once it reaches the tens of millions, which also makes retention cheap.
4. Production settings would differ from these dev defaults (`shared_buffers` ~25 % of RAM,
   `work_mem` sized so the A4 sort does not spill), but none of the conclusions above depend
   on them: the wins come from reading 17–168 pages instead of 2,439–41,521.
