from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import Settings

# argon2-cffi defaults are the RFC 9106 "low memory" Argon2id profile.
_hasher = PasswordHasher()

# Verified against when the e-mail is unknown, so a login for a missing user costs the same
# time as a wrong password (no user-enumeration timing signal).
_DUMMY_HASH = _hasher.hash("timing-equaliser-not-a-real-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: int
    role: str
    expires_at: datetime


def issue_token(settings: Settings, *, user_id: int, role: str) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=settings.jwt_expires_minutes)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "iat": now,
            "exp": expires,
            "iss": "finpilot-api",
        },
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )
    return token, expires


def decode_token(settings: Settings, token: str) -> TokenClaims | None:
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],  # pinned: never trust the header's alg
            issuer="finpilot-api",
            options={"require": ["sub", "exp", "iat", "role"]},
        )
        return TokenClaims(
            user_id=int(claims["sub"]),
            role=str(claims["role"]),
            expires_at=datetime.fromtimestamp(claims["exp"], UTC),
        )
    except (jwt.PyJWTError, ValueError, KeyError):
        return None
