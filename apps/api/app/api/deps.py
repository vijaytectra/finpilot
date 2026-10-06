from collections.abc import Awaitable, Callable
from typing import Annotated

import structlog
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.models import User
from app.models.enums import Role
from app.repositories.users import UserRepository

SessionDep = Annotated[AsyncSession, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


async def get_current_user(request: Request, session: SessionDep, settings: SettingsDep) -> User:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise UnauthorizedError("Authentication required")
    claims = decode_token(settings, token)
    if claims is None:
        raise UnauthorizedError("Session is invalid or has expired", code="SESSION_EXPIRED")
    # Re-read the user on every request: deactivation or a role change takes effect
    # immediately instead of waiting for token expiry (one PK lookup).
    user = await UserRepository(session).get_by_id(claims.user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Session is no longer valid", code="SESSION_EXPIRED")
    structlog.contextvars.bind_contextvars(user_id=user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: Role) -> Callable[[User], Awaitable[User]]:
    allowed = {r.value for r in roles}

    async def _check(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise ForbiddenError("You do not have permission to perform this action")
        return user

    return _check


AdminUser = Annotated[User, Depends(require_role(Role.ADMIN))]
