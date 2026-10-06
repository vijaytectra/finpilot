"""Batch lifecycle. The batch row is committed in its *own* short transaction before any data
is touched, so a failed merge (rolled back) still leaves a FAILED batch behind for audit."""

import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import func, insert, update
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.importers.csv_source import CsvFile
from app.models import ImportBatch, ImportRowError
from app.models.enums import ImportKind, ImportStatus


@dataclass(slots=True)
class RowIssue:
    line_number: int
    error_code: str
    message: str
    raw_data: dict[str, Any]
    field: str | None = None
    severity: str = "REJECTED"


@dataclass(slots=True)
class ImportOutcome:
    batch_id: uuid.UUID
    kind: ImportKind
    filename: str
    total_rows: int = 0
    inserted_rows: int = 0
    duplicate_rows: int = 0
    rejected_rows: int = 0
    issues: list[RowIssue] = field(default_factory=list)


async def open_batch(
    engine: AsyncEngine,
    *,
    kind: ImportKind,
    source: str,
    csv_file: CsvFile,
    uploaded_by: int | None,
) -> uuid.UUID:
    async with engine.begin() as conn:
        batch_id: uuid.UUID = (
            await conn.execute(
                insert(ImportBatch)
                .values(
                    kind=kind.value,
                    source=source,
                    filename=csv_file.filename,
                    file_sha256=csv_file.sha256,
                    file_bytes=csv_file.size_bytes,
                    uploaded_by=uploaded_by,
                    status=ImportStatus.PROCESSING.value,
                    total_rows=len(csv_file.rows),
                )
                .returning(ImportBatch.id)
            )
        ).scalar_one()
    return batch_id


async def record_issues(conn: AsyncConnection, batch_id: uuid.UUID, issues: list[RowIssue]) -> None:
    if not issues:
        return
    await conn.execute(
        insert(ImportRowError),
        [
            {
                "batch_id": batch_id,
                "line_number": i.line_number,
                "severity": i.severity,
                "error_code": i.error_code,
                "field": i.field,
                "message": i.message,
                "raw_data": i.raw_data,
            }
            for i in issues
        ],
    )


async def complete_batch(conn: AsyncConnection, outcome: ImportOutcome) -> None:
    await conn.execute(
        update(ImportBatch)
        .where(ImportBatch.id == outcome.batch_id)
        .values(
            status=ImportStatus.COMPLETED.value,
            inserted_rows=outcome.inserted_rows,
            duplicate_rows=outcome.duplicate_rows,
            rejected_rows=outcome.rejected_rows,
            completed_at=func.now(),
        )
    )


async def fail_batch(engine: AsyncEngine, batch_id: uuid.UUID, message: str) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            update(ImportBatch)
            .where(ImportBatch.id == batch_id)
            .values(
                status=ImportStatus.FAILED.value,
                error_message=message[:2000],
                completed_at=func.now(),
            )
        )
