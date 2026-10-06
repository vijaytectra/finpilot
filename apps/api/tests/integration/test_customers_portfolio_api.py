"""Customer search/profile and portfolio valuation. Expected portfolio numbers are recomputed
independently from the raw CSVs (Decimal arithmetic, duplicates removed) so the SQL is
checked against a second implementation, not against itself."""

import csv
from collections import defaultdict
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

import httpx
import pytest

from app.core.config import get_settings

CENT = Decimal("0.01")


def _rows(name: str) -> list[dict[str, str]]:
    with (get_settings().data_dir / name).open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


@dataclass
class Expected:
    market_value: Decimal = Decimal(0)
    cost: Decimal = Decimal(0)
    positions: int = 0
    by_class: dict[str, Decimal] = field(default_factory=lambda: defaultdict(Decimal))


def _expected_portfolio(customer_id: str) -> Expected:
    accounts = {r["account_id"] for r in _rows("accounts.csv") if r["customer_id"] == customer_id}
    instruments = {r["instrument_id"]: r for r in _rows("instruments.csv")}
    seen: set[tuple[str, str]] = set()
    exp = Expected()
    for h in _rows("holdings_snapshot.csv"):
        key = (h["account_id"], h["instrument_id"])
        if h["account_id"] not in accounts or key in seen:
            continue
        seen.add(key)
        inst = instruments[h["instrument_id"]]
        qty = Decimal(h["quantity"])
        value = qty * Decimal(inst["last_price"])
        exp.market_value += value
        exp.cost += qty * Decimal(h["avg_cost"])
        exp.by_class[inst["asset_class"]] += value
        exp.positions += 1
    return exp


def _r(value: Decimal) -> float:
    return float(value.quantize(CENT, rounding=ROUND_HALF_UP))


async def test_endpoints_require_authentication(client: httpx.AsyncClient) -> None:
    for path in ("/api/v1/customers", "/api/v1/customers/C0026/portfolio"):
        assert (await client.get(path)).status_code == 401


async def test_search_matches_name_case_insensitively(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get("/api/v1/customers", params={"search": "AARAV"})).json()
    assert {i["customer_id"] for i in body["items"]} == {"C0010", "C0089"}
    assert body["pagination"] == {"page": 1, "page_size": 20, "total": 2, "pages": 1}


@pytest.mark.parametrize(
    ("term", "expected"),
    [("c0026", {"C0026"}), ("rohan.kulkarni26@", {"C0026"}), ("pune", None)],
)
async def test_search_covers_id_email_and_city(
    viewer: httpx.AsyncClient, term: str, expected: set[str] | None
) -> None:
    items = (await viewer.get("/api/v1/customers", params={"search": term})).json()["items"]
    if expected is None:
        assert items
        assert all(i["city"] == "Pune" for i in items)
    else:
        assert {i["customer_id"] for i in items} == expected


async def test_search_treats_wildcards_literally(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get("/api/v1/customers", params={"search": "%"})).json()
    assert body["pagination"]["total"] == 0


async def test_pagination_and_aum_sort(viewer: httpx.AsyncClient) -> None:
    first = (await viewer.get("/api/v1/customers", params={"sort": "-aum", "page_size": 3})).json()
    assert [i["customer_id"] for i in first["items"]] == ["C0026", "C0100", "C0008"]
    assert first["pagination"] == {"page": 1, "page_size": 3, "total": 120, "pages": 40}
    beyond = (await viewer.get("/api/v1/customers", params={"page": 99, "page_size": 3})).json()
    assert beyond["items"] == []
    assert beyond["pagination"]["total"] == 120


@pytest.mark.parametrize(
    "params", [{"page_size": 1000}, {"page": 0}, {"sort": "password"}, {"kyc_status": "X"}]
)
async def test_hostile_query_parameters_are_rejected(
    viewer: httpx.AsyncClient, params: dict[str, str | int]
) -> None:
    response = await viewer.get("/api/v1/customers", params=params)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_profile_includes_latest_risk(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get("/api/v1/customers/C0026")).json()
    assert body["full_name"] == "Rohan Kulkarni"
    assert body["risk_profile"] == {
        "risk_score": 88,
        "risk_level": "Aggressive",
        "assessed_at": "2026-04-19",
        "horizon_years": 2,
        "liquidity_need": "HIGH",
    }
    assert (body["accounts"], body["goals"]) == (3, 1)


async def test_unknown_customer_is_404_with_envelope(viewer: httpx.AsyncClient) -> None:
    response = await viewer.get("/api/v1/customers/C9999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"


# C0105/C0104/C0103 own the accounts with duplicated holdings rows (A00147/A00146/A00145).
@pytest.mark.parametrize("customer_id", ["C0026", "C0100", "C0105", "C0104", "C0103", "C0047"])
async def test_portfolio_matches_independent_calculation(
    viewer: httpx.AsyncClient, customer_id: str
) -> None:
    body = (await viewer.get(f"/api/v1/customers/{customer_id}/portfolio")).json()
    exp = _expected_portfolio(customer_id)
    assert body["totals"]["market_value"] == _r(exp.market_value)
    assert body["totals"]["cost_basis"] == _r(exp.cost)
    assert body["totals"]["positions"] == exp.positions
    assert {a["asset_class"]: a["market_value"] for a in body["allocation"]} == {
        k: _r(v) for k, v in exp.by_class.items()
    }
    if exp.positions:  # C0047's only account is CLOSED: no holdings, empty allocation
        assert sum(a["weight_pct"] for a in body["allocation"]) == pytest.approx(100, abs=0.05)
    assert body["freshness"]["snapshot_date"] == "2026-09-18"


async def test_duplicate_holdings_are_not_double_counted(viewer: httpx.AsyncClient) -> None:
    # A00147 is C0105's account; the CSV lists A00147/I0049 twice.
    body = (await viewer.get("/api/v1/customers/C0105/portfolio")).json()
    i0049 = [p for p in body["positions"] if p["instrument_id"] == "I0049"]
    assert len(i0049) == 1
    assert i0049[0]["quantity"] == 133.573


async def test_customer_without_holdings_gets_zeroed_portfolio(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get("/api/v1/customers/C0001/portfolio")).json()
    assert body["totals"]["market_value"] == 0
    assert body["totals"]["unrealized_pnl_pct"] is None
    assert body["positions"] == []
    assert body["allocation"] == []
    assert [a["status"] for a in body["accounts"]] == ["CLOSED"]  # still listed
