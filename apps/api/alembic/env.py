import asyncio

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings
from app.models import Base

config = context.config
target_metadata = Base.metadata

# The URL always comes from settings/env, never from alembic.ini, so no credential is committed.
DATABASE_URL = get_settings().database_url.get_secret_value()


def run_migrations_offline() -> None:
    """Emit SQL to stdout (`alembic upgrade head --sql`) for review / DBA hand-off."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # PostgreSQL has transactional DDL: each migration commits fully or not at all.
        transaction_per_migration=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_async_migrations())
