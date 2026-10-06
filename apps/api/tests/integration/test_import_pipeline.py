"""Regression tests pinning the handling of every deliberate anomaly in the supplied data,
plus the idempotency / conflict rules of the transaction importer."""

from datetime import date

import pytest
from sqlalchemy import text

from app.core.database import engine
from app.importers.batches import ImportOutcome
from app.importers.transactions import import_transactions

pytestmark = pytest.mark.usefixtures("seeded")

HEADER = (
    b"transaction_id,account_id,instrument_id,transaction_type,trade_date,quantity,price,amount,"
    b"status\n"
)
AS_OF = date(2026, 9, 30)


def _codes(outcome: ImportOutcome) -> dict[int, set[str]]:
    by_line: dict[int, set[str]] = {}
    for issue in outcome.issues:
        by_line.setdefault(issue.line_number, set()).add(issue.error_code)
    return by_line


def test_seed_rejects_exactly_the_planted_holding_duplicates(seeded: dict[str, object]) -> None:
    holdings = seeded["HOLDINGS"]
    assert isinstance(holdings, ImportOutcome)
    assert (holdings.total_rows, holdings.inserted_rows, holdings.rejected_rows) == (985, 982, 3)
    assert {i.raw_data["account_id"] for i in holdings.issues} == {"A00145", "A00146", "A00147"}
    assert {i.error_code for i in holdings.issues} == {"DUPLICATE_IN_FILE"}


def test_seed_rejects_exactly_the_planted_transaction_anomalies(
    seeded: dict[str, object],
) -> None:
    tx = seeded["TRANSACTIONS"]
    assert isinstance(tx, ImportOutcome)
    assert (tx.total_rows, tx.inserted_rows, tx.duplicate_rows, tx.rejected_rows) == (
        4554,
        4550,
        0,
        4,
    )
    rejected = {(i.raw_data["transaction_id"], i.error_code) for i in tx.issues}
    assert rejected == {
        ("T0000026", "DUPLICATE_IN_FILE"),
        ("T0004551", "UNKNOWN_INSTRUMENT"),
        ("T0004552", "NEGATIVE_AMOUNT"),
        ("T0004553", "FUTURE_TRADE_DATE"),
    }


async def test_first_occurrence_of_duplicated_transaction_is_kept() -> None:
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text("SELECT amount, status FROM transactions WHERE transaction_id = 'T0000026'")
            )
        ).one()
    assert (str(row.amount), row.status) == ("16686.83", "SETTLED")


async def test_reimporting_the_supplied_file_is_idempotent() -> None:
    from app.core.config import get_settings

    content = (get_settings().data_dir / "transactions.csv").read_bytes()
    async with engine.connect() as conn:
        before = await conn.scalar(text("SELECT count(*) FROM transactions"))
    outcome = await import_transactions(engine, content, as_of=AS_OF)
    async with engine.connect() as conn:
        after = await conn.scalar(text("SELECT count(*) FROM transactions"))
    assert (outcome.inserted_rows, outcome.duplicate_rows, outcome.rejected_rows) == (0, 4550, 4)
    assert before == after


async def test_row_level_rules_each_produce_a_reason() -> None:
    content = HEADER + b"\n".join(
        [
            b"T9100001,A00002,I0001,BUY,2026-09-01,2,100,200,SETTLED",  # valid
            b"T9100002,A00002,I0001,BUY,2026-02-30,2,100,200,SETTLED",  # impossible date
            b"T9100003,A00002,I0001,BUY,2026-09-01,two,100,200,SETTLED",  # not a number
            b"T9100004,A00002,I0001,SWAP,2026-09-01,2,100,200,DONE",  # bad enums
            b"T9100005,A99999,I0001,BUY,2026-09-01,2,100,200,SETTLED",  # unknown account
            b"T9100006,A00002,I0001,BUY,2026-09-01,2,100,999,SETTLED",  # amount != qty*price
            b"T9100007,A00002,I0001,DIVIDEND,2026-09-01,5,1,5,SETTLED",  # cash event shape
            b"T9100008,A00002,,BUY,2026-09-01,2,100,200,SETTLED",  # missing instrument
            b"BAD-ID,A00002,I0001,BUY,2026-09-01,2,100,200,SETTLED",  # id format
            b"T9100001,A00002,I0001,BUY,2026-09-01,2,100,200,SETTLED",  # in-file duplicate
        ]
    )
    outcome = await import_transactions(engine, content, filename="rules.csv", as_of=AS_OF)
    codes = _codes(outcome)
    assert outcome.inserted_rows == 1
    assert outcome.rejected_rows == 9
    assert codes[3] == {"INVALID_DATE"}
    assert codes[4] == {"INVALID_NUMBER"}
    assert codes[5] == {"INVALID_ENUM"}
    assert codes[6] == {"UNKNOWN_ACCOUNT"}
    assert codes[7] == {"AMOUNT_MISMATCH"}
    assert codes[8] == {"INVALID_TRADE_SHAPE"}
    assert codes[9] == {"MISSING_FIELD"}
    assert codes[10] == {"INVALID_FORMAT"}
    assert codes[11] == {"DUPLICATE_IN_FILE"}
    assert sum(i.error_code == "INVALID_ENUM" for i in outcome.issues) == 2  # type AND status


async def test_same_id_with_different_content_is_rejected_not_overwritten() -> None:
    first = HEADER + b"T9200001,A00002,I0001,BUY,2026-09-01,2,100,200,SETTLED\n"
    changed = HEADER + b"T9200001,A00002,I0001,BUY,2026-09-01,3,100,300,SETTLED\n"
    assert (await import_transactions(engine, first, as_of=AS_OF)).inserted_rows == 1

    outcome = await import_transactions(engine, changed, as_of=AS_OF)

    assert outcome.rejected_rows == 1
    assert outcome.issues[0].error_code == "CONFLICTS_WITH_EXISTING"
    async with engine.connect() as conn:
        qty = await conn.scalar(
            text("SELECT quantity FROM transactions WHERE transaction_id = 'T9200001'")
        )
    assert str(qty) == "2.000000"


async def test_batch_counters_reconcile_and_are_persisted() -> None:
    async with engine.connect() as conn:
        bad = await conn.scalar(
            text(
                "SELECT count(*) FROM import_batches WHERE status = 'COMPLETED'"
                " AND total_rows <> inserted_rows + duplicate_rows + rejected_rows"
            )
        )
    assert bad == 0
