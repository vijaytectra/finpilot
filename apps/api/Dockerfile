# syntax=docker/dockerfile:1.7
#
# FinPilot API image. Build context is the REPOSITORY ROOT so the synthetic seed data
# (data/raw) can be baked in and the image is self-contained:
#
#   docker build -f apps/api/Dockerfile -t finpilot-api .
#
# The file next to this one, Dockerfile.dockerignore, limits the context to apps/api + data/raw.

ARG PYTHON_IMAGE=python:3.12-slim-bookworm

# ---------- builder: resolve and install locked dependencies into /app/.venv ----------
FROM ${PYTHON_IMAGE} AS builder
# uv from PyPI (pinned) rather than ghcr.io: one registry fewer for reviewers' machines/CI.
ARG UV_VERSION=0.11.7
RUN pip install --no-cache-dir "uv==${UV_VERSION}"
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app

# Dependencies first (cached layer), application code second.
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project
COPY apps/api/alembic.ini ./
COPY apps/api/alembic ./alembic
COPY apps/api/app ./app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# ---------- runtime: no uv, no compilers, non-root ----------
FROM ${PYTHON_IMAGE} AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:${PATH}" \
    DATA_DIR=/app/data/raw \
    API_PORT=8000 \
    UVICORN_WORKERS=2 \
    SEED_ON_START=true

RUN groupadd --system --gid 10001 finpilot \
 && useradd --system --uid 10001 --gid finpilot --home-dir /app --shell /usr/sbin/nologin finpilot

WORKDIR /app
COPY --from=builder --chown=finpilot:finpilot /app /app
COPY --chown=finpilot:finpilot data/raw /app/data/raw
COPY --chown=finpilot:finpilot --chmod=0755 apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER finpilot
EXPOSE 8000

# Readiness = API up AND database reachable (the endpoint returns 503 otherwise).
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD python -c "import os,sys,urllib.request as u; sys.exit(0 if u.urlopen(f'http://127.0.0.1:{os.environ.get(\"API_PORT\",\"8000\")}/api/v1/health', timeout=2).status == 200 else 1)"

ENTRYPOINT ["docker-entrypoint.sh"]
