import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import ImportKind, ImportStatus
from app.schemas.common import ApiModel, Pagination


class ImportRowErrorOut(ApiModel):
    line_number: int = Field(description="Physical line in the uploaded file; header = 1")
    severity: str
    error_code: str
    field: str | None
    message: str
    raw_data: dict[str, Any]


class ImportBatchOut(ApiModel):
    id: uuid.UUID
    kind: ImportKind
    source: str
    status: ImportStatus
    filename: str
    file_sha256: str
    file_bytes: int
    uploaded_by: str | None = Field(description="E-mail of the uploading user; null for seed")
    total_rows: int
    inserted_rows: int
    duplicate_rows: int = Field(description="Already present with identical values (skipped)")
    rejected_rows: int
    error_message: str | None
    started_at: datetime
    completed_at: datetime | None


class ImportReport(ImportBatchOut):
    """Upload response: the batch plus the first page of row-level rejections."""

    errors: list[ImportRowErrorOut]
    errors_total: int
    errors_truncated: bool


class ImportBatchPage(BaseModel):
    items: list[ImportBatchOut]
    pagination: Pagination


class ImportErrorPage(BaseModel):
    items: list[ImportRowErrorOut]
    pagination: Pagination
