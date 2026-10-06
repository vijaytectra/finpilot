from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, SecretStr, StringConstraints

from app.models.enums import Role
from app.schemas.common import ApiModel


class LoginRequest(BaseModel):
    email: Annotated[
        str,
        StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=254),
        Field(examples=["viewer@finpilot.local"]),
    ]
    password: Annotated[SecretStr, Field(min_length=1, max_length=256, examples=["Viewer@12345"])]


class UserOut(ApiModel):
    id: int
    email: str
    full_name: str
    role: Role


class SessionOut(BaseModel):
    user: UserOut
    expires_at: datetime
