from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

_CENT = Decimal("0.01")


def _two_dp(value: Decimal) -> float:
    return float(value.quantize(_CENT, rounding=ROUND_HALF_UP))


# All arithmetic happens in PostgreSQL NUMERIC / Python Decimal; values are rounded half-up
# to 2 dp only at the API boundary, and emitted as JSON numbers for chart/table consumers.
MoneyOut = Annotated[Decimal, PlainSerializer(_two_dp, return_type=float, when_used="json")]
PercentOut = MoneyOut
# Quantities / prices keep their stored precision.
QuantityOut = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]


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

    @classmethod
    def build(cls, page: int, page_size: int, total: int) -> "Pagination":
        return cls(page=page, page_size=page_size, total=total, pages=-(-total // page_size))


def like_pattern(term: str) -> str:
    """Escape LIKE wildcards so user input is matched literally (bound as a parameter)."""
    escaped = term.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def error_responses(*codes: int) -> dict[int | str, dict[str, object]]:
    return {code: {"model": ErrorResponse} for code in codes}
