"""Import audit trail: every load (seed or admin upload) is a batch; every rejected or skipped
row is an import_error carrying the original raw row as JSON."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    Table,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, in_check
from app.models.enums import ImportKind, ImportStatus, values


class ImportBatch(Base):
    __tablename__ = "import_batches"
    __table_args__ = (
        CheckConstraint(in_check("kind", values(ImportKind)), name="kind_valid"),
        CheckConstraint(in_check("status", values(ImportStatus)), name="status_valid"),
        CheckConstraint("source IN ('SEED', 'UPLOAD')", name="source_valid"),
        CheckConstraint(
            "total_rows = inserted_rows + duplicate_rows + rejected_rows OR status <> 'COMPLETED'",
            name="counts_reconcile",
        ),
        Index(None, "kind", text("started_at DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, server_default=text("gen_random_uuid()")
    )
    kind: Mapped[str] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(10))
    filename: Mapped[str] = mapped_column(String(255))
    file_sha256: Mapped[str] = mapped_column(String(64))
    file_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(12))
    total_rows: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    inserted_rows: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    # Rows already present with identical content: skipped so re-imports are idempotent.
    duplicate_rows: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    rejected_rows: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ImportRowError(Base):
    __tablename__ = "import_errors"
    __table_args__ = (
        CheckConstraint("severity IN ('REJECTED', 'SKIPPED')", name="severity_valid"),
        Index(None, "batch_id", "line_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("import_batches.id", ondelete="CASCADE"))
    # Physical line in the uploaded file (header = line 1) so operators can open the file
    # and land on the exact row.
    line_number: Mapped[int] = mapped_column(Integer)
    severity: Mapped[str] = mapped_column(String(10))
    error_code: Mapped[str] = mapped_column(String(40))
    field: Mapped[str | None] = mapped_column(String(60))
    message: Mapped[str] = mapped_column(Text)
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSONB)


# Landing zone for transaction uploads: every value kept as raw text so *nothing* is lost to a
# parse error before validation runs in SQL. UNLOGGED: it is transient and rebuilt per batch,
# so WAL durability would only cost write throughput.
staging_transactions = Table(
    "staging_transactions",
    Base.metadata,
    Column("batch_id", Uuid, nullable=False),
    Column("line_number", Integer, nullable=False),
    *(
        Column(name, Text)
        for name in (
            "transaction_id",
            "account_id",
            "instrument_id",
            "transaction_type",
            "trade_date",
            "quantity",
            "price",
            "amount",
            "status",
        )
    ),
    PrimaryKeyConstraint("batch_id", "line_number"),
    prefixes=["UNLOGGED"],
)
