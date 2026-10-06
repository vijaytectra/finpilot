"""Transaction CSV import: stage -> validate in SQL -> merge, inside one DB transaction.

Why SQL-side validation: foreign-key and duplicate checks are set operations against tables
that can hold millions of rows; doing them as joins in PostgreSQL scales, whereas pulling
every known id into Python does not.

Steps (all in one transaction, serialized per import kind by an advisory lock):
 1. COPY raw text rows into staging_transactions (nothing can fail on a bad value here)
 2. type-safe parse into a temp table (CASE-guarded casts; invalid input becomes NULL)
 3. run each rule as INSERT ... SELECT into import_errors
 4. merge rows with no errors; rows already present *identically* are counted as
    duplicates (idempotent re-import); same id with different content is rejected
 5. update batch counters, clear staging

If anything raises, the whole merge rolls back and the batch is marked FAILED.
"""

import uuid
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.core.logging import get_logger
from app.importers.batches import (
    ImportOutcome,
    RowIssue,
    complete_batch,
    fail_batch,
    open_batch,
)
from app.importers.csv_source import parse_csv
from app.models.enums import ImportKind

log = get_logger("app.import")

COLUMNS: tuple[str, ...] = (
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

# BUY/SELL amounts in the supplied data equal round(qty * price, 2); the largest deviation
# observed is exactly 0.005, so one paisa of tolerance is sufficient and still strict.
AMOUNT_TOLERANCE = "0.01"
_LOCK_KEY = "finpilot:import:TRANSACTIONS"

_RAW_JSON = "jsonb_build_object(" + ", ".join(f"'{c}', s.{c}" for c in COLUMNS) + ")"

_PARSE = f"""
CREATE TEMP TABLE parsed_tx ON COMMIT DROP AS
SELECT s.line_number,
       s.transaction_id, s.account_id, s.instrument_id, s.transaction_type, s.status,
       CASE WHEN s.trade_date ~ '^\\d{{4}}-\\d{{2}}-\\d{{2}}$'
             AND pg_input_is_valid(s.trade_date, 'date')
            THEN s.trade_date::date END                                   AS trade_date,
       CASE WHEN pg_input_is_valid(s.quantity, 'numeric(20,6)')
            THEN s.quantity::numeric(20,6) END                            AS quantity,
       CASE WHEN pg_input_is_valid(s.price, 'numeric(18,4)')
            THEN s.price::numeric(18,4) END                               AS price,
       CASE WHEN pg_input_is_valid(s.amount, 'numeric(18,2)')
            THEN s.amount::numeric(18,2) END                              AS amount,
       {_RAW_JSON}                                                        AS raw
FROM staging_transactions s
WHERE s.batch_id = :batch_id
"""

# Each rule: (error_code, field, message SQL expression, WHERE predicate over parsed_tx p).
# Messages are built in SQL so they quote the offending value.
_RULES: tuple[tuple[str, str | None, str, str], ...] = (
    *(
        (
            "MISSING_FIELD",
            col,
            f"'{col} is required'",
            f"(p.raw ->> '{col}') IS NULL",
        )
        for col in COLUMNS
    ),
    (
        "INVALID_FORMAT",
        "transaction_id",
        "'transaction_id ' || p.transaction_id || ' must match T + 7 digits'",
        "p.transaction_id !~ '^T[0-9]{7,}$'",
    ),
    (
        "INVALID_ENUM",
        "transaction_type",
        "'transaction_type ' || p.transaction_type || ' is not one of BUY, SELL, DIVIDEND, FEE'",
        "p.transaction_type NOT IN ('BUY', 'SELL', 'DIVIDEND', 'FEE')",
    ),
    (
        "INVALID_ENUM",
        "status",
        "'status ' || p.status || ' is not one of SETTLED, PENDING, REVERSED'",
        "p.status NOT IN ('SETTLED', 'PENDING', 'REVERSED')",
    ),
    (
        "INVALID_DATE",
        "trade_date",
        "'trade_date ' || (p.raw ->> 'trade_date') || ' is not a valid YYYY-MM-DD date'",
        "(p.raw ->> 'trade_date') IS NOT NULL AND p.trade_date IS NULL",
    ),
    *(
        (
            "INVALID_NUMBER",
            col,
            f"'{col} ' || (p.raw ->> '{col}') || ' is not a valid number'",
            f"(p.raw ->> '{col}') IS NOT NULL AND p.{col} IS NULL",
        )
        for col in ("quantity", "price", "amount")
    ),
    (
        "FUTURE_TRADE_DATE",
        "trade_date",
        "'trade_date ' || p.trade_date || ' is after the import business date '"
        " || CAST(:as_of AS date)",
        "p.trade_date > CAST(:as_of AS date)",
    ),
    (
        "NEGATIVE_AMOUNT",
        "amount",
        "'amount ' || p.amount || ' is negative; ' || p.transaction_type"
        " || ' amounts are recorded as positive values with direction given by the type'",
        "p.amount < 0",
    ),
    (
        "INVALID_TRADE_SHAPE",
        "quantity",
        "p.transaction_type || ' requires quantity > 0 and price > 0'",
        "p.transaction_type IN ('BUY', 'SELL') AND (p.quantity <= 0 OR p.price <= 0)",
    ),
    (
        "INVALID_TRADE_SHAPE",
        "quantity",
        "p.transaction_type || ' is a cash event and requires quantity = 0 and price = 0'",
        "p.transaction_type IN ('DIVIDEND', 'FEE') AND (p.quantity <> 0 OR p.price <> 0)",
    ),
    (
        "AMOUNT_MISMATCH",
        "amount",
        "'amount ' || p.amount || ' differs from quantity x price = '"
        " || round(p.quantity * p.price, 2)",
        f"p.transaction_type IN ('BUY', 'SELL') AND p.quantity > 0 AND p.price > 0"
        f" AND abs(p.quantity * p.price - p.amount) > {AMOUNT_TOLERANCE}",
    ),
    (
        "UNKNOWN_ACCOUNT",
        "account_id",
        "'account_id ' || p.account_id || ' does not exist'",
        "p.account_id IS NOT NULL"
        " AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.account_id = p.account_id)",
    ),
    (
        "UNKNOWN_INSTRUMENT",
        "instrument_id",
        "'instrument_id ' || p.instrument_id || ' does not exist'",
        "p.instrument_id IS NOT NULL"
        " AND NOT EXISTS (SELECT 1 FROM instruments i WHERE i.instrument_id = p.instrument_id)",
    ),
    (
        "DUPLICATE_IN_FILE",
        "transaction_id",
        "'transaction_id ' || p.transaction_id || ' already appears on line '"
        " || (SELECT min(q.line_number) FROM parsed_tx q"
        "     WHERE q.transaction_id = p.transaction_id)",
        "EXISTS (SELECT 1 FROM parsed_tx q"
        " WHERE q.transaction_id = p.transaction_id AND q.line_number < p.line_number)",
    ),
    (
        "CONFLICTS_WITH_EXISTING",
        "transaction_id",
        "'transaction_id ' || p.transaction_id || ' already exists with different values;"
        " refusing to overwrite'",
        "EXISTS (SELECT 1 FROM transactions t WHERE t.transaction_id = p.transaction_id"
        " AND (t.account_id, t.instrument_id, t.transaction_type, t.trade_date,"
        "      t.quantity, t.price, t.amount, t.status)"
        " IS DISTINCT FROM (p.account_id, p.instrument_id, p.transaction_type, p.trade_date,"
        "      p.quantity, p.price, p.amount, p.status))",
    ),
)

_VALID_ROWS = """
FROM parsed_tx p
WHERE NOT EXISTS (
    SELECT 1 FROM import_errors e
    WHERE e.batch_id = :batch_id AND e.line_number = p.line_number AND e.severity = 'REJECTED'
)
"""


async def _stage(
    conn: AsyncConnection, batch_id: uuid.UUID, rows: list[tuple[object, ...]]
) -> None:
    """COPY into staging via asyncpg: orders of magnitude faster than row INSERTs."""
    raw = await conn.get_raw_connection()
    driver = raw.driver_connection
    assert driver is not None  # noqa: S101 - asyncpg always exposes its connection
    await driver.copy_records_to_table(
        "staging_transactions",
        records=rows,
        columns=["batch_id", "line_number", *COLUMNS],
    )


async def _apply_rules(conn: AsyncConnection, batch_id: uuid.UUID, as_of: date) -> None:
    for code, field, message, predicate in _RULES:
        await conn.execute(
            text(
                f"""
                INSERT INTO import_errors
                    (batch_id, line_number, severity, error_code, field, message, raw_data)
                SELECT :batch_id, p.line_number, 'REJECTED', :code, :field, {message}, p.raw
                FROM parsed_tx p
                WHERE {predicate}
                """
            ),
            {"batch_id": batch_id, "code": code, "field": field, "as_of": as_of},
        )


async def merge_staged(conn: AsyncConnection, outcome: ImportOutcome, as_of: date) -> None:
    batch_id = outcome.batch_id
    await conn.execute(text(_PARSE), {"batch_id": batch_id})
    await _apply_rules(conn, batch_id, as_of)

    duplicates = await conn.scalar(
        text(
            "SELECT count(*) "
            + _VALID_ROWS
            + " AND EXISTS (SELECT 1 FROM transactions t WHERE t.transaction_id = p.transaction_id)"
        ),
        {"batch_id": batch_id},
    )
    inserted = await conn.execute(
        text(
            """
            INSERT INTO transactions
                (transaction_id, account_id, instrument_id, transaction_type, trade_date,
                 quantity, price, amount, status, import_batch_id)
            SELECT p.transaction_id, p.account_id, p.instrument_id, p.transaction_type,
                   p.trade_date, p.quantity, p.price, p.amount, p.status, :batch_id
            """
            + _VALID_ROWS
            + " ORDER BY p.line_number ON CONFLICT (transaction_id) DO NOTHING"
        ),
        {"batch_id": batch_id},
    )
    rejected = await conn.scalar(
        text(
            "SELECT count(DISTINCT line_number) FROM import_errors"
            " WHERE batch_id = :batch_id AND severity = 'REJECTED'"
        ),
        {"batch_id": batch_id},
    )
    await conn.execute(
        text("DELETE FROM staging_transactions WHERE batch_id = :batch_id"),
        {"batch_id": batch_id},
    )
    outcome.inserted_rows = inserted.rowcount
    outcome.duplicate_rows = int(duplicates or 0)
    outcome.rejected_rows = int(rejected or 0)


async def load_issues(conn: AsyncConnection, batch_id: uuid.UUID) -> list[RowIssue]:
    result = await conn.execute(
        text(
            "SELECT line_number, error_code, message, raw_data, field, severity"
            " FROM import_errors WHERE batch_id = :batch_id ORDER BY line_number, id"
        ),
        {"batch_id": batch_id},
    )
    return [
        RowIssue(
            line_number=r.line_number,
            error_code=r.error_code,
            message=r.message,
            raw_data=r.raw_data,
            field=r.field,
            severity=r.severity,
        )
        for r in result
    ]


async def import_transactions(
    engine: AsyncEngine,
    content: bytes,
    *,
    filename: str = "transactions.csv",
    source: str = "UPLOAD",
    uploaded_by: int | None = None,
    as_of: date | None = None,
) -> ImportOutcome:
    csv_file = parse_csv(filename, content, COLUMNS)
    batch_id = await open_batch(
        engine,
        kind=ImportKind.TRANSACTIONS,
        source=source,
        csv_file=csv_file,
        uploaded_by=uploaded_by,
    )
    outcome = ImportOutcome(batch_id, ImportKind.TRANSACTIONS, filename, len(csv_file.rows))
    try:
        async with engine.begin() as conn:
            # Must be the first statement: the driver opens the DB transaction lazily and the
            # COPY below has to run inside it. Serializes concurrent transaction imports; the PK
            # already prevents double inserts, the lock keeps duplicate/conflict
            # classification exact when two admins upload at once.
            await conn.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": _LOCK_KEY}
            )
            business_date = as_of or await conn.scalar(text("SELECT current_date"))
            assert isinstance(business_date, date)  # noqa: S101
            await _stage(
                conn,
                batch_id,
                [
                    (batch_id, row.line_number, *(row.values[c] for c in COLUMNS))
                    for row in csv_file.rows
                ],
            )
            await merge_staged(conn, outcome, business_date)
            await complete_batch(conn, outcome)
            outcome.issues = await load_issues(conn, batch_id)
    except Exception as exc:
        await fail_batch(engine, batch_id, f"{type(exc).__name__}: {exc}")
        log.exception("import_failed", kind="TRANSACTIONS", batch_id=str(batch_id))
        raise
    log.info(
        "import_completed",
        kind="TRANSACTIONS",
        batch_id=str(batch_id),
        total=outcome.total_rows,
        inserted=outcome.inserted_rows,
        duplicates=outcome.duplicate_rows,
        rejected=outcome.rejected_rows,
    )
    return outcome
