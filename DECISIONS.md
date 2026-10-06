# DECISIONS

Assumptions, deliberate omissions, known limitations and the key architecture decisions for
FinPilot. The architecture report (`docs/architecture/architecture-report.md`) explains the
design; this file is the short list a reviewer can check claims against.

## 1. Assumptions

| # | Assumption | Consequence |
|---|---|---|
| A1 | The holdings snapshot is the authoritative position record; the transaction file is a partial ledger sample | Portfolio value = snapshot quantity x instrument `last_price`. The ledger is displayed as history and is not used to derive positions (0 of 982 positions reconcile to it) |
| A2 | `last_price` / `price_as_of` on `instruments` is "the latest synthetic price"; there is no price history | Unrealised P&L is against `avg_cost`; the UI shows `snapshot_date` and `price_as_of` so the user can judge freshness, and `stale_prices` flags a price older than the snapshot |
| A3 | All amounts are in INR (every account and instrument in the data is INR) | No FX conversion; `currency` columns are stored and validated but not converted |
| A4 | `amount` is always non-negative; direction comes from `transaction_type` | A negative amount is rejected, not sign-flipped |
| A5 | Net cash flow = SETTLED BUY - SELL. PENDING has not moved cash; REVERSED was undone; DIVIDEND/FEE are not investment flows | Monthly flow report and view use this definition |
| A6 | "Business date" for future-date validation is the database `current_date` at import time | A trade dated after the import day is rejected `FUTURE_TRADE_DATE` |
| A7 | "Holder" means a distinct customer, not an account | Top-instruments query counts `DISTINCT customer_id` |
| A8 | VIEWER is the wealth-service user and may maintain goals; ADMIN additionally imports data | Goal create/edit is allowed for both roles; imports are ADMIN only |
| A9 | Goal funded % = `current_funded_amount / target_amount`; "high priority under 25 %" is `funded < 0.25 x target` (strict) | Same rule in the API flag, the overview report and the SQL task |
| A10 | A goal whose name describes a different type is a data-entry inconsistency, not an error | Loaded and flagged `NAME_TYPE_MISMATCH`; the type field wins for behaviour |
| A11 | Trades before account `opened_at` (1,069) and on CLOSED/DORMANT accounts (311 loaded) may be legitimate history | Loaded; the first is surfaced as a reconciliation exception, the second via reviewer query Q6d |

## 2. Deliberate omissions

* Order execution, brokerage routing, payments, money movement.
* Investment advice, suitability, rebalancing recommendations.
* Real-time or historical market data; price feeds.
* Notifications (e-mail/SMS/push), scheduled jobs, background workers.
* User management UI, password reset, SSO/MFA (seeded demo users only).
* Multi-tenancy, row-level security per advisor/book.
* Kubernetes, service mesh, microservices, message brokers, Redis.
* Upload of reference files (customers, accounts, instruments, goals, risk profiles, holdings)
  through the API: they are loaded by the idempotent seed command; transactions are the
  supported upload, as the assignment suggests.

## 3. Known limitations

| # | Limitation | Impact | Fix when needed |
|---|---|---|---|
| L1 | Login rate limits are in-process memory | Both budgets (5/min per client IP + e-mail, 10/min per e-mail) are counted per uvicorn worker (compose runs 2) and per replica and reset on restart, so the effective limits are N x workers x replicas. Behind the web proxy the API sees the web container as the client (see R2), so the IP budget effectively acts per account | Redis/gateway limiter behind the same interface (`SlidingWindowLimiter`); an overwriting edge proxy for real client IPs |
| L3 | Offset pagination | Deep pages cost O(offset) (measured 293 ms at page 2,000 for a 50k-row customer on a 3M-row table) | Keyset cursor `(trade_date, transaction_id)`, measured 0.6 ms |
| L4 | No optimistic locking on goals | `SELECT ... FOR UPDATE` serialises concurrent writes, but a user can save over a change made after they opened the form (last write wins) | `version` column or `If-Match` on `updated_at` -> 409 |
| L5 | Customer list values every customer's portfolio before paging (`v_customer_aum` join) | Negligible on supplied data (3 ms); ~0.5-1.1 s at 100k customers | Page first, value the page; materialized AUM for AUM sort |
| L6 | Seed users exist only in non-production environments | A production deployment has no user until one is provisioned out of band | Admin bootstrap command / SSO |
| L7 | Holdings and transactions do not reconcile | Positions cannot be explained by the ledger; P&L history cannot be derived | Needs complete ledger or opening balances from the source system |
| L8 | Each money figure is rounded half-up to 2 dp independently at serialisation | Sum of displayed parts may differ from the displayed total by up to 0.01 per part (documented in OpenAPI) | Largest-remainder allocation in the UI if exact visual footing is required |
| L9 | Money is emitted as JSON numbers | Consumers parsing into binary floats see representation error beyond 2 dp (values are already rounded, so display is exact) | Emit decimal strings in a v2 contract if downstream systems compute with them |
| L10 | Import runs synchronously in the HTTP request | Large files hold a request and a connection for the whole merge (bounded by the 25 MB cap and the 15 s statement timeout per statement) | Job table + worker, `202 Accepted`, progress polling |
| L13 | CSRF protection relies on `SameSite=Lax`; no `Origin` check or CSRF token | A malicious page on the same *site* (e.g. another app on `localhost`) could submit the multipart upload with the admin's cookie | `Origin`/`Sec-Fetch-Site` check on unsafe methods |
| L14 | Failed-login log lines contain the attempted e-mail and client IP | PII in logs (synthetic here) | Hash or tokenise in production, restricted log access |
| L15 | No metrics endpoint or tracing | Diagnosis relies on structured logs + `request_id` | RED metrics, OpenTelemetry |

### Resolved during the architecture review

These were open when the review started and are now fixed on `main`; the ids are kept so earlier
references stay meaningful.

| # | Was | Fix | Evidence |
|---|---|---|---|
| R1 (was L12) | The development `JWT_SECRET` default passed the 32-character check, so a production deployment that forgot to set it would sign tokens with a public value | `Settings._production_guards` (`app/core/config.py`): with `ENVIRONMENT=production` start-up fails on a known/`local-dev` secret or `COOKIE_SECURE=false`. `.env.example` deliberately ships a labelled local-only secret so `cp .env.example .env && docker compose up` works | `tests/unit/test_config.py` |
| R2 (was L2; found in E2E, fixed in PR #9) | First attempt (`FORWARDED_ALLOW_IPS="*"` so the limiter would see the real client) was unsafe: the full-stack E2E test showed the Next.js rewrite forwards a client-supplied `X-Forwarded-For` verbatim, so a caller could forge a new IP per attempt and bypass the (IP, e-mail) limit entirely (12 forged-IP attempts, none limited) | `FORWARDED_ALLOW_IPS` now defaults to `127.0.0.1`: forwarded headers from the web container are not trusted (set it only to an edge proxy that overwrites the header). A second, unspoofable budget of 10/min per e-mail is charged on every attempt in addition to 5/min per (IP, e-mail). Trade-off: a flood can lock one account's sign-in for up to a minute. After the fix the same test gets 401 x 5, then 429 | `tests/unit/test_login_rate_limit.py`, `docker-compose.yml`, `.env.example` |
| R3 (was L11) | A transactions row with more fields than the header had the surplus values dropped and could load | Rows whose field count differs from the header are rejected as `MALFORMED_ROW` inside the import transaction and excluded from the merge | regression test in `tests/integration/test_import_pipeline.py` (PR #7) |
| R4 | Console (non-JSON) logs whenever `ENVIRONMENT=local`, including inside containers | `use_json_logs()` (`app/core/logging.py`): JSON whenever the environment is not `local` or stdout is not a TTY, so every container emits one JSON object per line | `app/main.py` |

## 4. Decision records

Format: context -> decision -> consequences. Status of all: **Accepted**.

### ADR-01 Natural business keys as primary keys
* **Context:** Every CSV carries stable, human-meaningful ids (`C0026`, `A00034`, `T0000026`) that
  operators use in conversation and in files. Imports must detect duplicates and FK violations by
  those ids.
* **Decision:** Use them as primary keys (with format `CHECK`s); composite natural keys where the
  identity is composite (`holdings_snapshot (snapshot_date, account_id, instrument_id)`,
  `risk_profiles (customer_id, assessed_at)`). Surrogate keys only where no natural key exists
  (`users.id`, `import_batches.id` uuid, `import_errors.id`). New goals get `G` + sequence.
* **Consequences:** + No id-mapping tables; idempotency is a PK lookup; FK errors name real ids;
  duplicate positions are structurally impossible. - Re-keying an entity would be expensive;
  string keys are slightly larger than integers (irrelevant at this scale).

### ADR-02 `VARCHAR + CHECK` instead of PostgreSQL `ENUM`
* **Context:** Vocabularies (kyc_status, asset_class, transaction_type, ...) are small but may
  change; `ALTER TYPE ... ADD VALUE` has historically had transaction restrictions and values can
  never be removed.
* **Decision:** `VARCHAR(n)` columns with named `CHECK (col IN (...))` constraints, mirrored by
  Python `StrEnum`s for API validation and OpenAPI.
* **Consequences:** + Adding/removing a value is a drop/add constraint inside a transactional
  migration; plain text in dumps and drivers. - The list exists in two places (model enum and
  constraint); `alembic check` in CI catches model/migration drift.

### ADR-03 `NUMERIC` money and all money maths in the database
* **Context:** Financial totals must foot; binary floats cannot represent 0.1.
* **Decision:** `NUMERIC(18,2)` amounts, `NUMERIC(18,4)` prices, `NUMERIC(20,6)` quantities;
  valuation and aggregation in SQL views and queries; `Decimal` in Python; round half-up to 2 dp
  only at serialisation.
* **Consequences:** + Exact arithmetic; one definition of market value used by API, reports and
  SQL tasks. - Independently rounded figures can differ by 0.01 per part from a rounded total
  (L8).

### ADR-04 Partial-acceptance import with an explicit idempotency rule
* **Context:** The files contain a few bad rows among thousands of good ones; operators need the
  good data loaded and a precise list of what was refused. Re-running a load must be safe.
* **Decision:** Structural problems refuse the whole file. Row problems quarantine the row in
  `import_errors` (line number, code, field, message, raw row as JSONB) and the rest loads.
  Duplicates in the file: first occurrence wins, later ones rejected. Row already in the database
  with identical values: counted as `duplicate_rows`, skipped. Same id with different values:
  rejected `CONFLICTS_WITH_EXISTING`, never overwritten. Counters are reconciled by a `CHECK`.
* **Consequences:** + Re-uploading a file is a no-op with a clear report; nothing is silently
  corrected or overwritten. - Correcting a wrong row requires an explicit, separate action (not
  built); a business may prefer all-or-nothing for some feeds.

### ADR-05 Validate transactions in SQL via an `UNLOGGED` staging table
* **Context:** FK and duplicate checks must scale with tables of millions of rows; a single bad
  value must not abort the load.
* **Decision:** `COPY` raw text into `staging_transactions`; parse into a temp table with
  `CASE WHEN pg_input_is_valid(...)` casts; one `INSERT ... SELECT` into `import_errors` per rule;
  merge rows without errors with `INSERT ... SELECT ... ON CONFLICT DO NOTHING`; all in one
  transaction.
* **Consequences:** + Set-based checks, `COPY` speed, no lost rows before validation, atomic
  merge. - Rules are SQL strings (built only from module constants; reviewed and lint-exempted
  in one file); `pg_input_is_valid` requires PostgreSQL 16+. `UNLOGGED` staging is emptied after
  a crash, which is acceptable for transient data.

### ADR-06 Serialise imports with a transaction-scoped advisory lock
* **Context:** Two admins uploading overlapping files concurrently could each classify the same
  id as "new"; the PK prevents a double insert but the reports would be wrong.
* **Decision:** `pg_advisory_xact_lock(hashtext('finpilot:import:TRANSACTIONS'))` as the first
  statement of the merge transaction; the batch row is committed beforehand in its own
  transaction so a failed merge still leaves a `FAILED` audit record.
* **Consequences:** + Exact duplicate/conflict counts; lock released automatically on
  commit/rollback, even if the process dies. - Transaction imports are serial (fine for daily
  files; a queue would be needed for many concurrent large loads).

### ADR-07 JWT in an HttpOnly cookie, not `localStorage`
* **Context:** The browser app needs a session; tokens readable by JavaScript are exfiltrated by
  any XSS.
* **Decision:** Login sets `finpilot_session` = HS256 JWT with `HttpOnly; SameSite=Lax; Path=/`
  (`Secure` over HTTPS), 60-minute expiry; algorithm pinned and claims required on decode; the
  user row is re-read on each request for immediate deactivation/role changes.
* **Consequences:** + No token in JS, revocation without a denylist, stateless verification.
  - Cookie-based auth needs CSRF thinking (SameSite now, `Origin` check next, L13); one PK
  lookup per request; no refresh token (re-login after an hour, acceptable internally).

### ADR-08 Same-origin deployment via a Next.js rewrite proxy
* **Context:** A cross-origin API would need CORS with credentials and third-party-cookie
  behaviour that browsers increasingly restrict.
* **Decision:** The browser calls `/api/v1/*` on the web origin; Next.js rewrites to
  `API_INTERNAL_URL` (`http://api:8000` in compose). The API keeps a strict CORS allow-list only
  for direct development use.
* **Consequences:** + First-party cookie, no preflights, API not exposed to the browser network;
  one public origin to put TLS/WAF in front of. - The web tier is in the request path; client IP
  is not trusted from the web container (it forwards client `X-Forwarded-For` verbatim), so the
  API sees the proxy as the client until an overwriting edge proxy is added (R2).

### ADR-09 Plain views, not materialized views
* **Context:** Portfolio, AUM, flows and exception logic should be defined once and reused.
* **Decision:** Plain views (`v_position_valuation`, `v_customer_aum`, `v_monthly_net_flows`,
  `v_latest_risk_profile`, `v_data_quality_exceptions`), inlined by the planner.
* **Consequences:** + Always fresh, no refresh orchestration, customer predicates reach indexes
  (0.39 ms portfolio on 300k positions). - Whole-table aggregates recompute per request; measured
  limit and the materialization plan are in `docs/performance/query-plans.md`.

### ADR-10 FastAPI + SQLAlchemy 2 async + asyncpg
* **Context:** I/O-bound API, typed contracts, need for `COPY` and fine-grained SQL.
* **Decision:** FastAPI with Pydantic v2 (contracts generate OpenAPI 3.1), SQLAlchemy 2 async
  engine on asyncpg; ORM for simple entity CRUD (goals, users), `text()` with bind parameters for
  reporting SQL; one pooled engine per process (10 + 10 overflow, pre-ping, 15 s statement
  timeout).
* **Consequences:** + Concurrency without threads; asyncpg `copy_records_to_table`; readable SQL
  where SQL matters. - Two query styles in the codebase; async test setup is more involved.

### ADR-11 Alembic with `transaction_per_migration` and CI round-trips
* **Context:** The reviewer must build the schema from an empty database; a failed migration must
  not leave a half-applied schema.
* **Decision:** Alembic revisions (autogenerated, hand-reviewed; views/extension/sequence added
  by hand); `transaction_per_migration=True`; the URL comes from settings, never `alembic.ini`.
  CI runs `upgrade head` on an empty DB, `alembic check` for model drift, and `downgrade base` +
  `upgrade head`.
* **Consequences:** + Each revision is atomic; downgrades are proven, not assumed. - Very large
  future data migrations may need to be split out of the transaction (e.g. `CREATE INDEX
  CONCURRENTLY` cannot run inside one).

### ADR-12 Integration tests against real PostgreSQL
* **Context:** Most behaviour worth testing (CHECK constraints, SQL validation rules, views,
  `GROUPING SETS`, trigram search, advisory locks, `COPY`) is PostgreSQL-specific.
* **Decision:** pytest creates `<db>_test`, migrates it with Alembic and seeds the supplied CSVs
  once per session; API tests run through `httpx.ASGITransport`; pure rules (goal flags, CSV
  parsing, row contracts) are unit-tested without a database.
* **Consequences:** + Tests exercise the real SQL and the planted anomalies end to end; the same
  migrations are tested that ship. - Tests need a running PostgreSQL (a service container in CI,
  the compose `db` locally); the test helper refuses to drop any database whose name does not end
  in `_test`.

### ADR-13 Value the portfolio from the snapshot, not the ledger
* **Context:** Profiling showed no snapshot position equals the settled net BUY - SELL quantity
  and 1,187 of 3,068 ledger pairs would be net short.
* **Decision:** Positions and valuation come from `holdings_snapshot`; transactions are a
  filtered ledger view; the reconciliation gap is documented and queryable (Q6e).
* **Consequences:** + Correct, explainable portfolio numbers. - No position history or realised
  P&L until a complete ledger or opening balances exist (L7).
