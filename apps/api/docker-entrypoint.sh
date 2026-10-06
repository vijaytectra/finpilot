#!/bin/sh
# FinPilot API container start-up: migrate -> (optionally) seed -> serve.
#
# * Migrations: Alembic runs each revision in its own transaction (transaction_per_migration)
#   and PostgreSQL DDL is transactional, so a failing migration rolls back completely and
#   leaves the schema at the last good revision. The container then exits non-zero and
#   compose reports it; nothing is served against a half-migrated schema.
# * Seed: idempotent (insert-if-absent + duplicate counting), so restarts are no-ops.
#   Disable with SEED_ON_START=false (e.g. production).
set -eu

echo "[entrypoint] applying database migrations"
alembic upgrade head

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] seeding demo users and synthetic CSVs from ${DATA_DIR}"
  python -m app.cli seed
fi

echo "[entrypoint] starting API on :${API_PORT:-8000} with ${UVICORN_WORKERS:-2} worker(s)"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${API_PORT:-8000}" \
  --workers "${UVICORN_WORKERS:-2}" \
  --proxy-headers \
  --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-127.0.0.1}" \
  --no-access-log
