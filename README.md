# FinPilot — Investment Portfolio & Goal Monitoring Platform

A production-minded full-stack application for an internal wealth-service team: search a customer, understand their consolidated portfolio, allocation, risk profile, goals and transaction ledger, and let operations administrators import transaction CSVs safely. Built with **Next.js**, **FastAPI**, **PostgreSQL** and **Docker**. All data is synthetic.

| | |
|---|---|
| Web app | http://localhost:3000 |
| API (v1) | http://localhost:8000/api/v1 |
| Swagger UI / ReDoc | http://localhost:8000/docs · http://localhost:8000/redoc |
| OpenAPI spec | http://localhost:8000/openapi.json · [`docs/api/openapi.json`](docs/api/openapi.json) |
| Health | http://localhost:8000/api/v1/health |

---

## Quick start (Docker, one command)

Prerequisites: Docker Desktop / Docker Engine with Compose v2.24+.

```bash
git clone https://github.com/vijaytectra/finpilot.git
cd finpilot
cp .env.example .env          # works as-is for a local demo; see "Configuration"
docker compose up --build
```

First start takes a few minutes (image builds). When `web` is healthy, open http://localhost:3000.

### Demo credentials (local demo only)

| Role | E-mail | Password | Can |
|---|---|---|---|
| ADMIN | `admin@finpilot.local` | `Admin@12345` | everything + CSV import |
| VIEWER | `viewer@finpilot.local` | `Viewer@12345` | search, view, create/edit goals |

They are created by the seed from the `DEMO_*` values in `.env`, only when `ENVIRONMENT` is not `production`.

### What happens on start-up

```
db  (postgres:16, healthcheck pg_isready)
 └─► api  docker-entrypoint.sh
        1. alembic upgrade head          # schema from an empty DB; failure => container exits
        2. python -m app.cli seed        # demo users + data/raw/*.csv, idempotent
        3. uvicorn app.main:app          # HEALTHCHECK GET /api/v1/health (503 if DB down)
       └─► web  Next.js standalone server, proxies /api/* to the api (same origin)
```

Restarting is safe: the seed is insert-if-absent and reports everything as duplicates the second time.

Optional TLS reverse proxy (Caddy, local CA, one origin on https://localhost:8443):

```bash
docker compose --profile proxy up --build
```

Reset everything (drops the database volume): `docker compose down -v`.

---

## Data quality: what the seed does with the supplied CSVs

The raw files in [`data/raw/`](data/raw) are never edited; the importer detects and reports the deliberate anomalies.

| File | Rows | Loaded | Rejected | Reason (line numbers are physical file lines, header = 1) |
|---|---:|---:|---:|---|
| customers / accounts / instruments / risk_profiles / goals | 120 / 167 / 80 / 120 / 177 | all | 0 | |
| holdings_snapshot.csv | 985 | 982 | 3 | `DUPLICATE_IN_FILE`: A00145/I0036, A00146/I0010, A00147/I0049 repeated (first occurrence kept) |
| transactions.csv | 4,554 | 4,550 | 4 | `DUPLICATE_IN_FILE` T0000026 · `UNKNOWN_INSTRUMENT` I9999 (T0004551) · `NEGATIVE_AMOUNT` FEE −75 (T0004552) · `FUTURE_TRADE_DATE` 2027-01-05 (T0004553) |

Policy: invalid rows are rejected with a reason and kept in an audit trail (`import_batches`, `import_errors` with the raw row as JSON); valid rows load. Re-importing identical rows is a no-op; the same `transaction_id` with different values is rejected, never overwritten.

Inspect: `GET /api/v1/admin/imports` (admin), the Admin › Import page, or SQL:

```sql
SELECT rule, entity, count(*) FROM v_data_quality_exceptions GROUP BY 1, 2;
```

`v_data_quality_exceptions` also surfaces reconciliation findings that are *not* rejections (e.g. 1,069 trades dated before their account was opened; 149 goals whose name describes a different goal type). Note that the holdings snapshot does not reconcile to the transaction ledger, so the portfolio is valued from the snapshot; see [`DECISIONS.md`](DECISIONS.md).

---

## Running without Docker (development)

```bash
# 1. database only
cp .env.example .env
docker compose up -d db                      # PostgreSQL on 127.0.0.1:5433

# 2. API (Python 3.12, uv: https://docs.astral.sh/uv/)
cd apps/api
uv sync
uv run alembic upgrade head
uv run python -m app.cli seed
uv run uvicorn app.main:app --reload --port 8000

# 3. web (Node 22)
cd apps/web
cp .env.example .env.local                   # API_INTERNAL_URL=http://localhost:8000
npm ci
npm run dev                                  # http://localhost:3000
```

---

## Configuration

All configuration is environment variables; `.env` is git-ignored and `.env.example` is committed.

| Variable | Default (`.env.example`) | Purpose |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | finpilot / finpilot / local value | database credentials (compose refuses to start without a password) |
| `POSTGRES_PORT` | `5433` | host port (5433 avoids a local PostgreSQL on 5432) |
| `DATABASE_URL` | `postgresql+asyncpg://…@localhost:5433/finpilot` | used when the API runs on the host; compose overrides the host to `db` |
| `JWT_SECRET` | local-only value | ≥ 32 chars; **production refuses known dev secrets** |
| `JWT_EXPIRES_MINUTES` | `60` | session lifetime |
| `ENVIRONMENT` | `local` | `local` · `test` · `ci` · `production` (production: no demo users, requires `COOKIE_SECURE=true`) |
| `LOG_LEVEL` | `INFO` | logs are JSON whenever stdout is not a terminal |
| `COOKIE_SECURE` | `false` | set `true` behind HTTPS |
| `CORS_ORIGINS` | `http://localhost:3000` | only for cross-origin callers; the web app is same-origin via its proxy |
| `IMPORT_MAX_BYTES` | `26214400` | CSV upload limit (413 above it) |
| `API_PORT` / `WEB_PORT` / `PROXY_TLS_PORT` | `8000` / `3000` / `8443` | host ports |
| `UVICORN_WORKERS` | `2` | API worker processes |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | proxies whose `X-Forwarded-For` is trusted; only set to an edge proxy that overwrites the header |
| `SEED_ON_START` | `true` | run the idempotent seed at container start |
| `DEMO_ADMIN_*` / `DEMO_VIEWER_*` | see above | demo users (non-production only) |
| `API_INTERNAL_URL` (web) | `http://localhost:8000` (`http://api:8000` in compose) | where Next.js proxies `/api/*` |

---

## Database

```bash
cd apps/api
uv run alembic upgrade head      # create/upgrade schema
uv run alembic downgrade -1      # roll back the last revision
uv run alembic check             # fail if models and migrations have drifted
uv run alembic upgrade head --sql  # print the SQL for review
```

Each revision runs in its own transaction and PostgreSQL DDL is transactional, so a failing migration rolls back completely and the API container exits instead of serving a half-migrated schema. CI applies migrations to an empty database, checks drift, and round-trips `downgrade base` → `upgrade head` on every PR.

Reviewer SQL (top customers by AUM, allocation, monthly net flows, top instruments by holders, under-funded high-priority goals, data-quality exceptions): [`docs/sql/reviewer-queries.sql`](docs/sql/reviewer-queries.sql); query plans: [`docs/performance/query-plans.md`](docs/performance/query-plans.md).

---

## Tests

```bash
docker compose up -d db                 # API tests need PostgreSQL
cd apps/api && uv run pytest            # creates and drops a throwaway finpilot_test database
cd apps/api && uv run ruff check . && uv run mypy app tests
cd apps/web && npm test && npm run lint && npm run typecheck
```

The API suite runs against real PostgreSQL (constraints, SQL validation rules and views cannot be faithfully mocked) and includes regression tests for every planted data anomaly and an independent Decimal recomputation of portfolio values from the raw CSVs.

## CI/CD

| Workflow | Runs on | Steps |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | every PR and push to `main` | API: locked install, ruff lint + format check, `mypy --strict`, migrations on empty PostgreSQL 16, `alembic check`, downgrade/upgrade round-trip, pytest + coverage · Web: lint, typecheck, tests, production build |
| [`docker.yml`](.github/workflows/docker.yml) | every PR and push to `main` | build api/web images (GHA cache), Trivy scan (report-only), compose smoke test: db + api healthy and login succeeds |

Any failing step fails the pipeline. Deployment in this assignment is the documented local `docker compose` run; see *Mapping to production*.

---

## Project structure

```
.
├── apps/
│   ├── api/                  FastAPI service
│   │   ├── app/
│   │   │   ├── api/v1/       routers (HTTP only)
│   │   │   ├── services/     business rules
│   │   │   ├── repositories/ SQL / data access
│   │   │   ├── importers/    CSV parsing, row contracts, staging + SQL validation
│   │   │   ├── models/       SQLAlchemy tables
│   │   │   ├── schemas/      Pydantic request/response models
│   │   │   └── core/         config, DB engine, security, logging, errors
│   │   ├── alembic/          migrations
│   │   ├── tests/            unit + integration (real PostgreSQL)
│   │   └── Dockerfile
│   └── web/                  Next.js (App Router) frontend
├── data/raw/                 supplied synthetic CSVs (never modified)
├── docs/
│   ├── api/openapi.json
│   ├── architecture/         architecture report (.md + .docx) and diagrams
│   ├── performance/          EXPLAIN (ANALYZE, BUFFERS) evidence
│   └── sql/                  reviewer queries
├── infra/caddy/              optional TLS reverse proxy
├── .github/workflows/        ci.yml, docker.yml
├── docker-compose.yml
├── DECISIONS.md              assumptions, omissions, ADRs
└── .env.example
```

## Documentation

- Architecture report: [`docs/architecture/architecture-report.md`](docs/architecture/architecture-report.md) (Word: [`FinPilot_Architecture_Report.docx`](docs/architecture/FinPilot_Architecture_Report.docx))
- Decisions, assumptions and known limitations: [`DECISIONS.md`](DECISIONS.md)
- API contract: Swagger UI at `/docs`, spec in [`docs/api/openapi.json`](docs/api/openapi.json)

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` on 5433/8000/3000 | change `POSTGRES_PORT` / `API_PORT` / `WEB_PORT` in `.env` |
| `set POSTGRES_PASSWORD in .env` / `set JWT_SECRET in .env` | create `.env` from `.env.example` |
| api container restarting | `docker compose logs api` — a failed migration or unreachable DB is reported there |
| Windows: `docker-entrypoint.sh: not found` | the file must keep LF endings (enforced by `.gitattributes`); re-clone if an editor converted it |
| Start from scratch | `docker compose down -v && docker compose up --build` |

## Mapping to production

| Local (this repo) | Production |
|---|---|
| `postgres` container + volume | managed PostgreSQL (multi-AZ), automated backups + point-in-time recovery, PgBouncer in front |
| `.env` file | secrets manager / CI secrets; `ENVIRONMENT=production` refuses dev secrets and insecure cookies, disables demo users |
| migrations in the API entrypoint | a separate pre-deploy migration job; API replicas start with `SEED_ON_START=false` |
| one API container, 2 workers | N stateless replicas behind a load balancer; login rate limit moved to a shared store (Redis) or the gateway |
| Caddy with local CA (optional) | TLS terminated at the load balancer / ingress with a public certificate, HSTS |
| locally built images | images built once in CI, pushed to a registry with immutable tags, promoted between environments |
| stdout JSON logs | shipped to a log platform; metrics/alerts on 5xx rate, latency, DB pool saturation, import failures |
