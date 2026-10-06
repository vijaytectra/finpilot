import uuid
from typing import Any

from sqlalchemy import RowMapping, text
from sqlalchemy.ext.asyncio import AsyncSession

_BATCH_COLUMNS = """
    b.id, b.kind, b.source, b.status, b.filename, b.file_sha256, b.file_bytes,
    u.email AS uploaded_by, b.total_rows, b.inserted_rows, b.duplicate_rows,
    b.rejected_rows, b.error_message, b.started_at, b.completed_at
"""


class ImportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def list_batches(
        self, *, kind: str | None, limit: int, offset: int
    ) -> tuple[list[RowMapping], int]:
        where = "b.kind = :kind" if kind else "TRUE"
        params: dict[str, Any] = {"kind": kind, "limit": limit, "offset": offset}
        rows = (
            (
                await self._s.execute(
                    text(
                        f"""
                    SELECT {_BATCH_COLUMNS}, count(*) OVER () AS total
                    FROM import_batches b LEFT JOIN users u ON u.id = b.uploaded_by
                    WHERE {where}
                    ORDER BY b.started_at DESC, b.id
                    LIMIT :limit OFFSET :offset
                    """  # noqa: S608 - fixed fragments only
                    ),
                    params,
                )
            )
            .mappings()
            .all()
        )
        total = (
            int(rows[0]["total"])
            if rows
            else int(
                await self._s.scalar(
                    text(f"SELECT count(*) FROM import_batches b WHERE {where}"),  # noqa: S608
                    params,
                )
                or 0
            )
        )
        return list(rows), total

    async def get_batch(self, batch_id: uuid.UUID) -> RowMapping | None:
        return (
            (
                await self._s.execute(
                    text(
                        f"SELECT {_BATCH_COLUMNS} FROM import_batches b"  # noqa: S608
                        " LEFT JOIN users u ON u.id = b.uploaded_by WHERE b.id = :id"
                    ),
                    {"id": batch_id},
                )
            )
            .mappings()
            .one_or_none()
        )

    async def errors(
        self, batch_id: uuid.UUID, *, limit: int, offset: int
    ) -> tuple[list[RowMapping], int]:
        total = await self._s.scalar(
            text("SELECT count(*) FROM import_errors WHERE batch_id = :id"), {"id": batch_id}
        )
        rows = await self._s.execute(
            text(
                "SELECT line_number, severity, error_code, field, message, raw_data"
                " FROM import_errors WHERE batch_id = :id"
                " ORDER BY line_number, id LIMIT :limit OFFSET :offset"
            ),
            {"id": batch_id, "limit": limit, "offset": offset},
        )
        return list(rows.mappings()), int(total or 0)
