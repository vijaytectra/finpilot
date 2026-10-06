from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def record_login(self, user_id: int, password_hash: str | None = None) -> None:
        values: dict[str, object] = {"last_login_at": func.now()}
        if password_hash is not None:
            values["password_hash"] = password_hash
        await self._session.execute(update(User).where(User.id == user_id).values(**values))
