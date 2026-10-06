from collections.abc import AsyncIterator

import httpx
import pytest

from app.services.rate_limit import account_limiter, login_limiter

VIEWER = {"email": "viewer@finpilot.local", "password": "Viewer@12345"}
ADMIN = {"email": "admin@finpilot.local", "password": "Admin@12345"}


@pytest.fixture
async def client(seeded: dict[str, object]) -> AsyncIterator[httpx.AsyncClient]:
    from app.main import app

    login_limiter._events.clear()  # isolate rate-limit state between tests
    account_limiter._events.clear()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


async def _login(client: httpx.AsyncClient, creds: dict[str, str]) -> httpx.AsyncClient:
    response = await client.post("/api/v1/auth/login", json=creds)
    assert response.status_code == 200, response.text
    return client


@pytest.fixture
async def viewer(client: httpx.AsyncClient) -> httpx.AsyncClient:
    return await _login(client, VIEWER)


@pytest.fixture
async def admin(client: httpx.AsyncClient) -> httpx.AsyncClient:
    return await _login(client, ADMIN)
