"""Test harness: a real PostgreSQL database, rebuilt from migrations and seeded from the
supplied CSVs once per test session.

The DB-level behaviour under test (constraints, SQL validation rules, views) cannot be
faithfully reproduced with SQLite or mocks, so integration tests use PostgreSQL.
TEST_DATABASE_URL overrides the default (DATABASE_URL with the database renamed *_test).
"""

import asyncio
import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

# --- environment must be fixed before any app module (and its engine) is imported ---------
from app.core.config import Settings  # pure config: creates no engine

_base = Settings()
_url = (
    os.environ.get("TEST_DATABASE_URL")
    or _base.database_url.get_secret_value().rsplit("/", 1)[0] + "/finpilot_test"
)
os.environ["DATABASE_URL"] = _url
os.environ["ENVIRONMENT"] = "test"
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-for-hs256-signing")

API_DIR = Path(__file__).resolve().parents[1]


def _admin_dsn(url: str) -> tuple[str, str]:
    plain = url.replace("postgresql+asyncpg://", "postgresql://")
    base, db_name = plain.rsplit("/", 1)
    return base + "/postgres", db_name


async def _recreate_database(url: str) -> None:
    import asyncpg

    admin_dsn, db_name = _admin_dsn(url)
    if not db_name.endswith("_test"):
        raise RuntimeError(f"refusing to drop non-test database {db_name!r}")
    conn = await asyncpg.connect(admin_dsn)
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)')
        await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def migrated_database() -> str:
    """Sync fixture: runs outside the test event loop (alembic's env.py uses asyncio.run)."""
    from alembic import command
    from alembic.config import Config

    asyncio.run(_recreate_database(_url))
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "alembic"))
    command.upgrade(cfg, "head")
    return _url


@pytest.fixture(scope="session")
async def seeded(migrated_database: str) -> AsyncIterator[dict[str, object]]:
    """Seeds users + all CSVs; yields the import outcomes keyed by kind for assertions."""
    from app.cli import seed_users
    from app.core.config import get_settings
    from app.core.database import engine
    from app.importers.reference import REFERENCE_SPECS, import_reference
    from app.importers.transactions import import_transactions

    data_dir = get_settings().data_dir
    outcomes: dict[str, object] = {}
    await seed_users()
    for spec in REFERENCE_SPECS:
        outcome = await import_reference(engine, spec, (data_dir / spec.filename).read_bytes())
        outcomes[spec.kind.value] = outcome
    outcomes["TRANSACTIONS"] = await import_transactions(
        engine, (data_dir / "transactions.csv").read_bytes(), source="SEED"
    )
    yield outcomes
    await engine.dispose()
