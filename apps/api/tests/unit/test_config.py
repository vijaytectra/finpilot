import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings

STRONG = SecretStr("x" * 48)


def test_short_secret_is_refused() -> None:
    with pytest.raises(ValidationError, match="at least 32"):
        Settings(jwt_secret=SecretStr("short"))


@pytest.mark.parametrize(
    "secret",
    [
        "local-dev-only-jwt-secret-do-not-use-in-any-shared-environment",
        "insecure-local-development-secret-change-me",
    ],
)
def test_production_refuses_published_dev_secrets(secret: str) -> None:
    with pytest.raises(ValidationError, match="development default"):
        Settings(environment="production", jwt_secret=SecretStr(secret), cookie_secure=True)


def test_production_requires_secure_cookies() -> None:
    with pytest.raises(ValidationError, match="COOKIE_SECURE"):
        Settings(environment="production", jwt_secret=STRONG, cookie_secure=False)


def test_production_with_real_secret_and_https_is_accepted() -> None:
    settings = Settings(environment="production", jwt_secret=STRONG, cookie_secure=True)
    assert settings.environment == "production"


def test_cors_origins_accepts_comma_separated_env_style() -> None:
    settings = Settings(cors_origins="http://a.test, http://b.test")
    assert settings.cors_origins == ["http://a.test", "http://b.test"]
