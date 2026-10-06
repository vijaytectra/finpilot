from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]
    database: Literal["healthy", "unavailable"]
    environment: str
    version: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness + readiness (database reachability). Public; exposes no secrets.",
    responses={503: {"model": HealthResponse}},
)
async def health(response: Response) -> HealthResponse:
    settings = get_settings()
    db_state: Literal["healthy", "unavailable"] = "healthy"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_state = "unavailable"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(
        status="healthy" if db_state == "healthy" else "unhealthy",
        database=db_state,
        environment=settings.environment,
        version="1.0.0",
    )
