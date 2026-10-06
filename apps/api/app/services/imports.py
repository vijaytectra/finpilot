import uuid

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import engine
from app.core.errors import AppError, NotFoundError
from app.core.logging import get_logger
from app.importers.transactions import import_transactions
from app.repositories.imports import ImportRepository
from app.schemas.common import Pagination
from app.schemas.imports import (
    ImportBatchOut,
    ImportBatchPage,
    ImportErrorPage,
    ImportReport,
    ImportRowErrorOut,
)

log = get_logger("app.import")

REPORT_ERROR_LIMIT = 500
_CSV_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",  # what Windows browsers send for .csv
    "text/plain",
    "application/octet-stream",
}
_READ_CHUNK = 1024 * 1024


class ImportBatchNotFoundError(NotFoundError):
    code = "IMPORT_BATCH_NOT_FOUND"


async def read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    """Read at most max_bytes; refuse (413) as soon as the stream exceeds it, without
    buffering an arbitrarily large body first."""
    chunks: list[bytes] = []
    size = 0
    while chunk := await upload.read(_READ_CHUNK):
        size += len(chunk)
        if size > max_bytes:
            raise AppError(
                f"File exceeds the {max_bytes // (1024 * 1024)} MB upload limit",
                code="PAYLOAD_TOO_LARGE",
                status_code=413,
            )
        chunks.append(chunk)
    return b"".join(chunks)


def check_upload(upload: UploadFile) -> str:
    filename = (upload.filename or "").strip()
    if not filename.lower().endswith(".csv"):
        raise AppError(
            "Only .csv files are accepted", code="UNSUPPORTED_MEDIA_TYPE", status_code=415
        )
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in _CSV_CONTENT_TYPES:
        raise AppError(
            f"Content type {content_type} is not accepted for CSV upload",
            code="UNSUPPORTED_MEDIA_TYPE",
            status_code=415,
        )
    # Keep only the base name: never trust client-supplied paths.
    return filename.replace("\\", "/").rsplit("/", 1)[-1][:255]


class ImportService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._repo = ImportRepository(session)
        self._settings = settings

    async def upload_transactions(self, upload: UploadFile, user_id: int) -> ImportReport:
        filename = check_upload(upload)
        content = await read_limited(upload, self._settings.import_max_bytes)
        log.info("import_upload_received", filename=filename, bytes=len(content), by=user_id)
        outcome = await import_transactions(
            engine, content, filename=filename, source="UPLOAD", uploaded_by=user_id
        )
        batch = await self.batch(outcome.batch_id)
        errors, total = await self._repo.errors(
            outcome.batch_id, limit=REPORT_ERROR_LIMIT, offset=0
        )
        return ImportReport(
            **batch.model_dump(),
            errors=[ImportRowErrorOut.model_validate(dict(e)) for e in errors],
            errors_total=total,
            errors_truncated=total > len(errors),
        )

    async def batches(self, kind: str | None, page: int, page_size: int) -> ImportBatchPage:
        rows, total = await self._repo.list_batches(
            kind=kind, limit=page_size, offset=(page - 1) * page_size
        )
        return ImportBatchPage(
            items=[ImportBatchOut.model_validate(dict(r)) for r in rows],
            pagination=Pagination.build(page, page_size, total),
        )

    async def batch(self, batch_id: uuid.UUID) -> ImportBatchOut:
        row = await self._repo.get_batch(batch_id)
        if row is None:
            raise ImportBatchNotFoundError(f"Import batch {batch_id} was not found")
        return ImportBatchOut.model_validate(dict(row))

    async def errors(self, batch_id: uuid.UUID, page: int, page_size: int) -> ImportErrorPage:
        await self.batch(batch_id)
        rows, total = await self._repo.errors(
            batch_id, limit=page_size, offset=(page - 1) * page_size
        )
        return ImportErrorPage(
            items=[ImportRowErrorOut.model_validate(dict(r)) for r in rows],
            pagination=Pagination.build(page, page_size, total),
        )
