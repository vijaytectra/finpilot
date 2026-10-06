"""Loader for the reference / master-data CSVs (customers ... holdings).

Pipeline per file:  parse -> row contract (pydantic) -> in-file duplicate keys
-> foreign keys against the database -> insert-if-absent, all in ONE transaction.

Policy (documented in DECISIONS.md):
* A row failing any rule is REJECTED with a reason; it is never silently "fixed".
* Repeated keys inside one file: the first occurrence wins, later ones are rejected as
  DUPLICATE_IN_FILE (holdings_snapshot.csv has three exact repeats).
* Keys already in the database are counted as duplicates and left untouched: reference
  seeding is insert-only, so re-running the seed is idempotent and never overwrites.
"""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any, cast

from pydantic import BaseModel, ValidationError
from sqlalchemy import Table, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.core.logging import get_logger
from app.importers.batches import (
    ImportOutcome,
    RowIssue,
    complete_batch,
    fail_batch,
    open_batch,
    record_issues,
)
from app.importers.csv_source import CsvFile, parse_csv
from app.importers.rows import (
    AccountRow,
    CustomerRow,
    GoalRow,
    HoldingRow,
    InstrumentRow,
    RiskProfileRow,
)
from app.models import Account, Base, Customer, Goal, Holding, Instrument, RiskProfile
from app.models.enums import ImportKind

log = get_logger("app.import")

CHUNK = 1_000


@dataclass(frozen=True)
class ForeignKey:
    field: str
    table: Table
    column: str
    error_code: str


@dataclass(frozen=True)
class ReferenceSpec:
    kind: ImportKind
    filename: str
    row_model: type[BaseModel]
    table: Table
    key: tuple[str, ...]
    foreign_keys: tuple[ForeignKey, ...] = ()
    after_insert: Callable[[AsyncConnection], Any] | None = None

    @property
    def columns(self) -> tuple[str, ...]:
        return tuple(self.row_model.model_fields)


async def _sync_goal_sequence(conn: AsyncConnection) -> None:
    # Seeded goals carry explicit ids; move the sequence past them so API-created goals
    # never collide (G00178 onwards for the supplied data).
    await conn.execute(
        text(
            "SELECT setval('goal_id_seq', "
            "greatest((SELECT max(substring(goal_id FROM 2)::bigint) FROM goals), 1))"
        )
    )


def _table(model: type[Base]) -> Table:
    return cast(Table, model.__table__)


_customers = _table(Customer)
_accounts = _table(Account)
_instruments = _table(Instrument)

# Dependency order: parents before children.
REFERENCE_SPECS: tuple[ReferenceSpec, ...] = (
    ReferenceSpec(ImportKind.CUSTOMERS, "customers.csv", CustomerRow, _customers, ("customer_id",)),
    ReferenceSpec(
        ImportKind.INSTRUMENTS, "instruments.csv", InstrumentRow, _instruments, ("instrument_id",)
    ),
    ReferenceSpec(
        ImportKind.ACCOUNTS,
        "accounts.csv",
        AccountRow,
        _accounts,
        ("account_id",),
        (ForeignKey("customer_id", _customers, "customer_id", "UNKNOWN_CUSTOMER"),),
    ),
    ReferenceSpec(
        ImportKind.RISK_PROFILES,
        "risk_profiles.csv",
        RiskProfileRow,
        _table(RiskProfile),
        ("customer_id", "assessed_at"),
        (ForeignKey("customer_id", _customers, "customer_id", "UNKNOWN_CUSTOMER"),),
    ),
    ReferenceSpec(
        ImportKind.GOALS,
        "goals.csv",
        GoalRow,
        _table(Goal),
        ("goal_id",),
        (ForeignKey("customer_id", _customers, "customer_id", "UNKNOWN_CUSTOMER"),),
        after_insert=_sync_goal_sequence,
    ),
    ReferenceSpec(
        ImportKind.HOLDINGS,
        "holdings_snapshot.csv",
        HoldingRow,
        _table(Holding),
        ("snapshot_date", "account_id", "instrument_id"),
        (
            ForeignKey("account_id", _accounts, "account_id", "UNKNOWN_ACCOUNT"),
            ForeignKey("instrument_id", _instruments, "instrument_id", "UNKNOWN_INSTRUMENT"),
        ),
    ),
)


def _pydantic_issues(line: int, raw: dict[str, Any], exc: ValidationError) -> list[RowIssue]:
    issues = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"]) or None
        code = {
            "missing": "MISSING_FIELD",
            "enum": "INVALID_ENUM",
            "date_from_datetime_parsing": "INVALID_DATE",
            "date_parsing": "INVALID_DATE",
            "decimal_parsing": "INVALID_NUMBER",
            "int_parsing": "INVALID_NUMBER",
            "string_pattern_mismatch": "INVALID_FORMAT",
            "greater_than": "OUT_OF_RANGE",
            "greater_than_equal": "OUT_OF_RANGE",
            "less_than_equal": "OUT_OF_RANGE",
            "value_error": "BUSINESS_RULE",
        }.get(err["type"], "INVALID_VALUE")
        issues.append(RowIssue(line, code, f"{loc}: {err['msg']}" if loc else err["msg"], raw, loc))
    return issues


def validate_rows(
    spec: ReferenceSpec, csv_file: CsvFile
) -> tuple[list[tuple[int, BaseModel]], list[RowIssue]]:
    """Pure (no I/O): row contracts + in-file duplicate keys. Unit-testable."""
    valid: list[tuple[int, BaseModel]] = []
    issues: list[RowIssue] = []
    first_seen: dict[tuple[Any, ...], int] = {}
    for row in csv_file.rows:
        raw = dict(row.values)
        if row.malformed:
            issues.append(RowIssue(row.line_number, "MALFORMED_ROW", "wrong number of fields", raw))
            continue
        try:
            model = spec.row_model.model_validate({k: v for k, v in raw.items() if v is not None})
        except ValidationError as exc:
            issues.extend(_pydantic_issues(row.line_number, raw, exc))
            continue
        key = tuple(getattr(model, k) for k in spec.key)
        if key in first_seen:
            issues.append(
                RowIssue(
                    row.line_number,
                    "DUPLICATE_IN_FILE",
                    f"duplicate key {'/'.join(map(str, key))}; first seen on line "
                    f"{first_seen[key]}",
                    raw,
                    ",".join(spec.key),
                )
            )
            continue
        first_seen[key] = row.line_number
        valid.append((row.line_number, model))
    return valid, issues


async def _check_foreign_keys(
    conn: AsyncConnection, spec: ReferenceSpec, rows: list[tuple[int, BaseModel]]
) -> tuple[list[tuple[int, BaseModel]], list[RowIssue]]:
    if not spec.foreign_keys:
        return rows, []
    known: dict[str, set[Any]] = {}
    for fk in spec.foreign_keys:
        wanted = {getattr(m, fk.field) for _, m in rows}
        col = fk.table.c[fk.column]
        result = await conn.execute(select(col).where(col.in_(wanted)))
        known[fk.field] = set(result.scalars())
    ok: list[tuple[int, BaseModel]] = []
    issues: list[RowIssue] = []
    for line, model in rows:
        bad = [fk for fk in spec.foreign_keys if getattr(model, fk.field) not in known[fk.field]]
        if not bad:
            ok.append((line, model))
            continue
        raw = model.model_dump(mode="json")
        issues.extend(
            RowIssue(
                line,
                fk.error_code,
                f"{fk.field} {getattr(model, fk.field)} does not exist",
                raw,
                fk.field,
            )
            for fk in bad
        )
    return ok, issues


async def _insert_absent(
    conn: AsyncConnection, spec: ReferenceSpec, rows: Sequence[BaseModel]
) -> int:
    inserted = 0
    pk_cols = [spec.table.c[k] for k in spec.key]
    records = [m.model_dump() for m in rows]
    for start in range(0, len(records), CHUNK):
        stmt = (
            pg_insert(spec.table)
            .values(records[start : start + CHUNK])
            .on_conflict_do_nothing(index_elements=pk_cols)
            .returning(*pk_cols)
        )
        inserted += len((await conn.execute(stmt)).all())
    return inserted


async def import_reference(
    engine: AsyncEngine,
    spec: ReferenceSpec,
    content: bytes,
    *,
    filename: str | None = None,
    source: str = "SEED",
    uploaded_by: int | None = None,
) -> ImportOutcome:
    csv_file = parse_csv(filename or spec.filename, content, spec.columns)
    batch_id = await open_batch(
        engine, kind=spec.kind, source=source, csv_file=csv_file, uploaded_by=uploaded_by
    )
    outcome = ImportOutcome(batch_id, spec.kind, csv_file.filename, len(csv_file.rows))
    try:
        valid, issues = validate_rows(spec, csv_file)
        async with engine.begin() as conn:
            valid, fk_issues = await _check_foreign_keys(conn, spec, valid)
            issues.extend(fk_issues)
            outcome.inserted_rows = await _insert_absent(conn, spec, [m for _, m in valid])
            outcome.duplicate_rows = len(valid) - outcome.inserted_rows
            outcome.rejected_rows = len({i.line_number for i in issues})
            outcome.issues = sorted(issues, key=lambda i: i.line_number)
            await record_issues(conn, batch_id, outcome.issues)
            if spec.after_insert is not None:
                await spec.after_insert(conn)
            await complete_batch(conn, outcome)
    except Exception as exc:
        await fail_batch(engine, batch_id, f"{type(exc).__name__}: {exc}")
        log.exception("import_failed", kind=spec.kind, batch_id=str(batch_id))
        raise
    log.info(
        "import_completed",
        kind=spec.kind,
        batch_id=str(batch_id),
        total=outcome.total_rows,
        inserted=outcome.inserted_rows,
        duplicates=outcome.duplicate_rows,
        rejected=outcome.rejected_rows,
    )
    return outcome
