-- Scaled synthetic dataset used for docs/performance/query-plans.md.
-- NEVER run against the application database. Procedure:
--   docker exec -i finpilot-db-1 psql -U finpilot -d postgres -c "CREATE DATABASE finpilot_perf"
--   (apps/api) DATABASE_URL=postgresql+asyncpg://finpilot:<pw>@localhost:5433/finpilot_perf uv run alembic upgrade head
--   docker exec -i finpilot-db-1 psql -U finpilot -d finpilot_perf -v ON_ERROR_STOP=1 < docs/performance/perf-dataset.sql
--   ... run the EXPLAINs ...
--   docker exec -i finpilot-db-1 psql -U finpilot -d postgres -c "DROP DATABASE finpilot_perf WITH (FORCE)"
-- Deterministic (no random()): re-running produces the same rows. Load time on the reference
-- machine: ~6 minutes, dominated by the 3M-row transactions insert maintaining four indexes.
\timing on
SET synchronous_commit = off;
-- 100k customers. Names from 40x40 arrays, email unique via the sequence number.
INSERT INTO customers (customer_id, full_name, email, phone, city, state, date_of_birth,
                       onboarded_at, kyc_status, segment)
SELECT 'C' || lpad(g::text, 6, '0'),
       fn || ' ' || ln,
       lower(fn || '.' || ln || g || '@example.test'),
       '+91' || (9000000000 + g)::text,
       city, 'MH',
       date '1950-01-01' + (g * 7919 % 18000),
       date '2019-01-01' + (g::bigint * 104729 % 2400)::int,
       (ARRAY['VERIFIED','VERIFIED','VERIFIED','PENDING','REVIEW'])[1 + g % 5],
       (ARRAY['Mass','Mass','Affluent','HNI'])[1 + g % 4]
FROM generate_series(1, 100000) g
CROSS JOIN LATERAL (SELECT
  (ARRAY['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
         'Ananya','Diya','Saanvi','Aadhya','Pari','Anika','Navya','Myra','Sara','Zoya',
         'Rohan','Kabir','Dev','Neel','Om','Rahul','Kiran','Meera','Priya','Riya',
         'Tara','Isha','Nisha','Asha','Kavya','Lakshmi','Varun','Nikhil','Manav','Yash'])[1 + (g * 31) % 40] AS fn,
  (ARRAY['Sharma','Verma','Iyer','Nair','Menon','Reddy','Rao','Gupta','Agarwal','Mehta',
         'Shah','Patel','Desai','Joshi','Kulkarni','Pillai','Das','Bose','Sen','Ghosh',
         'Kapoor','Malhotra','Khanna','Chopra','Bhatia','Saxena','Mishra','Pandey','Tiwari','Dubey',
         'Singh','Gill','Sandhu','Kaur','Naidu','Hegde','Shetty','Kamath','Pai','Bhat'])[1 + (g * 17) % 40] AS ln,
  (ARRAY['Mumbai','Pune','Delhi','Bengaluru','Chennai','Hyderabad','Kolkata','Ahmedabad','Jaipur','Lucknow',
         'Kochi','Indore','Nagpur','Surat','Bhopal','Patna','Goa','Mysuru','Noida','Gurugram'])[1 + (g * 13) % 20] AS city
) n;

-- 500 instruments
INSERT INTO instruments (instrument_id, symbol, instrument_name, asset_class, sector, exchange,
                         currency, last_price, price_as_of, risk_band)
SELECT 'I' || lpad(g::text, 4, '0'), 'SYM' || g, 'Perf Instrument ' || g, ac,
       CASE WHEN ac = 'EQUITY' THEN (ARRAY['Banking','IT','Healthcare','Energy','FMCG'])[1 + g % 5] END,
       CASE WHEN ac IN ('BOND','GSEC') THEN 'OTC' ELSE 'NSE' END, 'INR',
       round((50 + (g * 7919 % 5000))::numeric + 0.25, 4), date '2026-09-18',
       (ARRAY['LOW','MEDIUM','HIGH'])[1 + g % 3]
FROM generate_series(1, 500) g
CROSS JOIN LATERAL (SELECT (ARRAY['EQUITY','EQUITY','EQUITY','ETF','MUTUAL_FUND','BOND','REIT','GSEC'])[1 + g % 8] AS ac) a;

-- 150k accounts: customer k owns A(k) and, for k <= 50000, also A(k+100000)
INSERT INTO accounts (account_id, customer_id, account_type, provider, opened_at, status, base_currency)
SELECT 'A' || lpad(g::text, 7, '0'),
       'C' || lpad((((g - 1) % 100000) + 1)::text, 6, '0'),
       (ARRAY['BROKERAGE','MUTUAL_FUND','RETIREMENT'])[1 + g % 3],
       (ARRAY['Zenith Broking','Northstar AMC','Harbor Securities'])[1 + g % 3],
       date '2019-01-01' + (g * 7 % 2000),
       (ARRAY['ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ACTIVE','DORMANT','CLOSED'])[1 + g % 8],
       'INR'
FROM generate_series(1, 150000) g;

-- 300k holdings: two distinct instruments per account, one snapshot date
INSERT INTO holdings_snapshot (snapshot_date, account_id, instrument_id, quantity, avg_cost)
SELECT date '2026-09-18', 'A' || lpad(a::text, 7, '0'),
       'I' || lpad((1 + (a * 37 + k * 101) % 500)::text, 4, '0'),
       round((1 + (a * k + 13) % 900)::numeric + 0.125, 6),
       round((40 + (a * 31 + k) % 5000)::numeric + 0.5, 4)
FROM generate_series(1, 150000) a CROSS JOIN generate_series(0, 1) k;

-- 3M transactions. Rows 1..50000 belong to the two accounts of customer C000001 (a heavy
-- customer for deep-pagination tests); the rest spread over all accounts. Insert order is
-- unrelated to account or date, as it would be for a real append-only ledger.
INSERT INTO transactions (transaction_id, account_id, instrument_id, transaction_type, trade_date,
                          quantity, price, amount, status)
SELECT 'T' || lpad(g::text, 8, '0'),
       CASE WHEN g <= 50000 THEN (ARRAY['A0000001','A0100001'])[1 + g % 2]
            ELSE 'A' || lpad((1 + (g * 7) % 150000)::text, 7, '0') END,
       'I' || lpad((1 + (g * 11) % 500)::text, 4, '0'),
       tt,
       date '2021-01-01' + (g * 13 % 2090),
       CASE WHEN tt IN ('BUY','SELL') THEN q ELSE 0 END,
       CASE WHEN tt IN ('BUY','SELL') THEN p ELSE 0 END,
       CASE WHEN tt IN ('BUY','SELL') THEN round(q * p, 2) ELSE round((10 + g % 500)::numeric, 2) END,
       (ARRAY['SETTLED','SETTLED','SETTLED','SETTLED','SETTLED','SETTLED','SETTLED','SETTLED','SETTLED',
              'SETTLED','SETTLED','SETTLED','SETTLED','PENDING','PENDING','REVERSED'])[1 + g % 16]
FROM generate_series(1, 3000000) g
CROSS JOIN LATERAL (SELECT
  (ARRAY['BUY','BUY','BUY','BUY','BUY','BUY','BUY','BUY','BUY',
         'SELL','SELL','SELL','SELL','SELL','SELL','SELL','DIVIDEND','DIVIDEND','FEE','FEE'])[1 + (g * 7) % 20] AS tt,
  round((1 + g % 200)::numeric, 6) AS q,
  round((50 + g % 3000)::numeric + 0.75, 4) AS p) x;

SET maintenance_work_mem = '32MB';  -- the container's 64 MB /dev/shm cannot fit a parallel vacuum
VACUUM (ANALYZE, PARALLEL 0) customers, instruments, accounts, holdings_snapshot, transactions;
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables WHERE relname IN ('customers','accounts','instruments','holdings_snapshot','transactions')
ORDER BY relname;

