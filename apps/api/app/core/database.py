from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings, get_settings


def build_engine(settings: Settings) -> AsyncEngine:
    """One pooled engine per process. Never open ad-hoc connections per request."""
    return create_async_engine(
        settings.database_url.get_secret_value(),
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout_seconds,
        pool_pre_ping=True,
        connect_args={
            "server_settings": {
                "application_name": "finpilot-api",
                "statement_timeout": str(settings.db_statement_timeout_ms),
            }
        },
    )


engine: AsyncEngine = build_engine(get_settings())
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Request-scoped session; uncommitted work is rolled back when the request ends."""
    async with SessionFactory() as session:
        yield session
