from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentUser, SessionDep, SettingsDep
from app.repositories.users import UserRepository
from app.schemas.auth import LoginRequest, SessionOut, UserOut
from app.schemas.common import error_responses
from app.services.auth import AuthService
from app.services.rate_limit import account_limiter, login_limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=SessionOut,
    summary="Sign in; sets an HttpOnly session cookie",
    description=(
        "On success the JWT is delivered **only** as an `HttpOnly`, `SameSite=Lax` cookie "
        "(never in the body), so page scripts cannot read it. Failed attempts are rate "
        "limited per client IP + e-mail (5 per minute)."
    ),
    responses=error_responses(401, 422, 429),
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
) -> SessionOut:
    client_ip = request.client.host if request.client else "unknown"
    service = AuthService(UserRepository(session), settings, login_limiter, account_limiter)
    user, token, expires_at = await service.login(
        payload.email, payload.password.get_secret_value(), client_ip
    )
    await session.commit()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        max_age=settings.jwt_expires_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return SessionOut(user=UserOut.model_validate(user), expires_at=expires_at)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear the session cookie",
)
async def logout(response: Response, settings: SettingsDep) -> Response:
    response.status_code = status.HTTP_204_NO_CONTENT
    response.delete_cookie(
        settings.auth_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return response


@router.get(
    "/me",
    response_model=UserOut,
    summary="The signed-in user",
    responses=error_responses(401),
)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
