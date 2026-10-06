from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorDetail(BaseModel):
    field: str | None = None
    location: str | None = None
    message: str
    type: str | None = None


class ErrorBody(BaseModel):
    code: Annotated[str, Field(examples=["CUSTOMER_NOT_FOUND"])]
    message: Annotated[str, Field(examples=["Customer C9999 was not found"])]
    request_id: Annotated[str | None, Field(examples=["req_3f2a9c1b7d4e5f60"])]
    details: list[ErrorDetail] | None = None


class ErrorResponse(BaseModel):
    """Envelope for every non-2xx response."""

    error: ErrorBody


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    pages: int


def error_responses(*codes: int) -> dict[int | str, dict[str, object]]:
    return {code: {"model": ErrorResponse} for code in codes}
