from datetime import datetime

from app.core.config import Settings
from app.core.errors import AppError, UnauthorizedError
from app.core.logging import get_logger
from app.core.security import hash_password, issue_token, needs_rehash, verify_password
from app.models import User
from app.repositories.users import UserRepository
from app.services.rate_limit import SlidingWindowLimiter

log = get_logger("app.auth")


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        settings: Settings,
        limiter: SlidingWindowLimiter,
        account_limiter: SlidingWindowLimiter,
    ) -> None:
        self._users = users
        self._settings = settings
        self._limiter = limiter
        self._account_limiter = account_limiter

    async def login(self, email: str, password: str, client_ip: str) -> tuple[User, str, datetime]:
        key = f"{client_ip}|{email}"
        # Both budgets are charged on every attempt; the per-account one cannot be evaded by
        # spoofing X-Forwarded-For.
        retry_after = max(
            (
                r
                for r in (self._limiter.hit(key), self._account_limiter.hit(email))
                if r is not None
            ),
            default=None,
        )
        if retry_after is not None:
            log.warning("login_rate_limited", email=email, client_ip=client_ip)
            raise AppError(
                f"Too many sign-in attempts. Try again in {retry_after:.0f} seconds.",
                code="RATE_LIMITED",
                status_code=429,
            )

        user = await self._users.get_by_email(email)
        # Always run a password verification, even for unknown users (timing equalisation).
        valid = verify_password(password, user.password_hash if user else None)
        if user is None or not valid or not user.is_active:
            # One message for all three cases: never reveal whether the e-mail exists.
            log.info("login_failed", email=email, client_ip=client_ip)
            raise UnauthorizedError("Invalid email or password", code="INVALID_CREDENTIALS")

        self._limiter.reset(key)
        self._account_limiter.reset(email)
        new_hash = hash_password(password) if needs_rehash(user.password_hash) else None
        await self._users.record_login(user.id, new_hash)
        token, expires_at = issue_token(self._settings, user_id=user.id, role=user.role)
        log.info("login_succeeded", user_id=user.id, role=user.role)
        return user, token, expires_at
