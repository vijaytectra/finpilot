"""Regression: the sign-in budget must not be resettable by rotating the client IP.

Behind the web proxy the client IP comes from X-Forwarded-For, which a caller can forge. The
per-(IP, e-mail) limiter alone could therefore be bypassed with a new fake IP per attempt.
"""

from typing import cast

import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.core.errors import AppError, UnauthorizedError
from app.models import User
from app.repositories.users import UserRepository
from app.services.auth import AuthService
from app.services.rate_limit import SlidingWindowLimiter


class _NoUsers:
    async def get_by_email(self, email: str) -> User | None:
        return None


def _service() -> AuthService:
    return AuthService(
        cast(UserRepository, _NoUsers()),
        Settings(jwt_secret=SecretStr("x" * 48)),
        SlidingWindowLimiter(max_events=5, window_seconds=60),
        SlidingWindowLimiter(max_events=10, window_seconds=60),
    )


async def test_rotating_client_ip_cannot_bypass_the_per_account_budget() -> None:
    service = _service()
    outcomes = []
    for attempt in range(12):
        spoofed_ip = f"203.0.113.{attempt}"  # a fresh forged address every time
        try:
            await service.login("victim@finpilot.local", "guess", spoofed_ip)
        except UnauthorizedError:
            outcomes.append(401)
        except AppError as exc:
            outcomes.append(exc.status_code)
    assert outcomes == [401] * 10 + [429, 429]


async def test_one_client_is_limited_per_account_before_the_account_budget() -> None:
    service = _service()
    outcomes = []
    for _ in range(6):
        try:
            await service.login("someone@finpilot.local", "guess", "198.51.100.1")
        except UnauthorizedError:
            outcomes.append(401)
        except AppError as exc:
            outcomes.append(exc.status_code)
    assert outcomes == [401] * 5 + [429]


async def test_budgets_are_per_account() -> None:
    service = _service()
    for attempt in range(10):
        with pytest.raises(UnauthorizedError):
            await service.login("a@finpilot.local", "guess", f"203.0.113.{attempt}")
    # A different account is unaffected by the exhausted one.
    with pytest.raises(UnauthorizedError):
        await service.login("b@finpilot.local", "guess", "203.0.113.99")
