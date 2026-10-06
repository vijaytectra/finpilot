from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _find_repo_root() -> Path:
    """Repo root locally; inside the container the layout differs, so fall back to cwd."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "data" / "raw").is_dir():
            return parent
    return Path.cwd()


REPO_ROOT = _find_repo_root()


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables (and .env when present)."""

    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["local", "test", "ci", "production"] = "local"
    log_level: str = "INFO"

    database_url: SecretStr = SecretStr(
        "postgresql+asyncpg://finpilot:finpilot@localhost:5432/finpilot"
    )
    db_pool_size: int = 10
    db_max_overflow: int = 10
    db_pool_timeout_seconds: float = 5.0
    db_statement_timeout_ms: int = 15_000

    jwt_secret: SecretStr = SecretStr("insecure-local-development-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60
    auth_cookie_name: str = "finpilot_session"
    cookie_secure: bool = False

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    import_max_bytes: int = 25 * 1024 * 1024
    data_dir: Path = REPO_ROOT / "data" / "raw"

    demo_admin_email: str = "admin@finpilot.local"
    demo_admin_password: SecretStr = SecretStr("Admin@12345")
    demo_viewer_email: str = "viewer@finpilot.local"
    demo_viewer_password: SecretStr = SecretStr("Viewer@12345")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("jwt_secret")
    @classmethod
    def _secret_strength(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
