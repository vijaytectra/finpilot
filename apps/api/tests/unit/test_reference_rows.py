from app.importers.csv_source import parse_csv
from app.importers.reference import REFERENCE_SPECS, ReferenceSpec, validate_rows
from app.models.enums import ImportKind


def _spec(kind: ImportKind) -> ReferenceSpec:
    return next(s for s in REFERENCE_SPECS if s.kind is kind)


def test_duplicate_holding_keys_first_occurrence_wins() -> None:
    spec = _spec(ImportKind.HOLDINGS)
    content = (
        b"account_id,instrument_id,quantity,avg_cost,snapshot_date\n"
        b"A00145,I0036,121.971,469.83,2026-09-18\n"
        b"A00146,I0010,1,10,2026-09-18\n"
        b"A00145,I0036,121.971,469.83,2026-09-18\n"
    )
    valid, issues = validate_rows(spec, parse_csv("h.csv", content, spec.columns))
    assert [line for line, _ in valid] == [2, 3]
    assert [(i.line_number, i.error_code) for i in issues] == [(4, "DUPLICATE_IN_FILE")]
    assert "first seen on line 2" in issues[0].message


def test_customer_contract_rejects_bad_values_with_field_level_reasons() -> None:
    spec = _spec(ImportKind.CUSTOMERS)
    header = (
        b"customer_id,full_name,email,phone,city,state,date_of_birth,onboarded_at,"
        b"kyc_status,segment\n"
    )
    content = (
        header + b"C0001,Ok Person,OK@Example.test,+919876543210,Pune,MH,1990-01-01,2024-01-01,"
        b"VERIFIED,Mass\n" + b"X1,Bad,not-an-email,123,Pune,MH,2030-01-01,2024-01-01,MAYBE,Gold\n"
    )
    valid, issues = validate_rows(spec, parse_csv("c.csv", content, spec.columns))
    assert len(valid) == 1
    assert valid[0][1].model_dump()["email"] == "ok@example.test"  # normalised to lower case
    codes = {(i.field, i.error_code) for i in issues if i.line_number == 3}
    assert ("customer_id", "INVALID_FORMAT") in codes
    assert ("email", "INVALID_FORMAT") in codes
    assert ("phone", "INVALID_FORMAT") in codes
    assert ("kyc_status", "INVALID_ENUM") in codes
    assert ("segment", "INVALID_ENUM") in codes


def test_instrument_sector_rule() -> None:
    spec = _spec(ImportKind.INSTRUMENTS)
    header = (
        b"instrument_id,symbol,instrument_name,asset_class,sector,exchange,currency,"
        b"last_price,price_as_of,risk_band\n"
    )
    content = (
        header
        + b"I0001,EQ1,Eq,EQUITY,,NSE,INR,10,2026-09-18,LOW\n"
        + b"I0002,BO1,Bond,BOND,Energy,OTC,INR,10,2026-09-18,LOW\n"
        + b"I0003,EQ3,Eq,EQUITY,Energy,NSE,INR,0,2026-09-18,LOW\n"
    )
    valid, issues = validate_rows(spec, parse_csv("i.csv", content, spec.columns))
    assert valid == []
    assert {(i.line_number, i.error_code) for i in issues} == {
        (2, "BUSINESS_RULE"),
        (3, "BUSINESS_RULE"),
        (4, "OUT_OF_RANGE"),
    }
