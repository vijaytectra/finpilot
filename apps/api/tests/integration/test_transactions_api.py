import httpx
import pytest

BASE = "/api/v1/customers/C0026/transactions"


async def test_default_page_is_newest_first_and_deterministic(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get(BASE, params={"page_size": 100})).json()
    keys = [(i["trade_date"], i["transaction_id"]) for i in body["items"]]
    assert keys == sorted(keys, reverse=True)
    assert body["pagination"]["total"] == 71  # all C0026 rows (accounts A00034-A00036)


async def test_pages_are_disjoint_and_cover_the_set(viewer: httpx.AsyncClient) -> None:
    seen: list[str] = []
    for page in (1, 2, 3):
        body = (await viewer.get(BASE, params={"page": page, "page_size": 30})).json()
        seen += [i["transaction_id"] for i in body["items"]]
    assert len(seen) == len(set(seen)) == 71


async def test_filters_combine(viewer: httpx.AsyncClient) -> None:
    params: dict[str, str | int | list[str]] = {
        "transaction_type": ["BUY", "SELL"],
        "status": "SETTLED",
        "account_id": "A00036",
        "date_from": "2025-06-01",
        "date_to": "2026-06-30",
        "page_size": 100,
    }
    items = (await viewer.get(BASE, params=params)).json()["items"]
    assert items
    for i in items:
        assert i["transaction_type"] in {"BUY", "SELL"}
        assert i["status"] == "SETTLED"
        assert i["account_id"] == "A00036"
        assert "2025-06-01" <= i["trade_date"] <= "2026-06-30"


async def test_instrument_filter_and_amount_sort(viewer: httpx.AsyncClient) -> None:
    facets = (await viewer.get(f"{BASE}/facets")).json()
    instrument = max(facets["instruments"], key=lambda o: o["count"])
    body = (
        await viewer.get(
            BASE, params={"instrument_id": instrument["value"], "sort": "-amount", "page_size": 100}
        )
    ).json()
    assert body["pagination"]["total"] == instrument["count"]
    amounts = [i["amount"] for i in body["items"]]
    assert amounts == sorted(amounts, reverse=True)


async def test_facet_counts_add_up(viewer: httpx.AsyncClient) -> None:
    facets = (await viewer.get(f"{BASE}/facets")).json()
    for key in ("accounts", "transaction_types", "statuses", "instruments"):
        assert sum(o["count"] for o in facets[key]) == 71, key
    assert facets["min_trade_date"] <= facets["max_trade_date"]


async def test_inverted_date_range_is_422(viewer: httpx.AsyncClient) -> None:
    response = await viewer.get(BASE, params={"date_from": "2026-02-01", "date_to": "2026-01-01"})
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "date_from"


async def test_other_customers_account_is_rejected(viewer: httpx.AsyncClient) -> None:
    # A00002 belongs to C0002: must not leak C0002's ledger through C0026's endpoint.
    response = await viewer.get(BASE, params={"account_id": "A00002"})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "params",
    [
        {"transaction_type": "TRANSFER"},
        {"account_id": "A1'; DROP TABLE transactions;--"},
        {"date_from": "yesterday"},
        {"page_size": 101},
    ],
)
async def test_malicious_or_invalid_params_are_422(
    viewer: httpx.AsyncClient, params: dict[str, str | int]
) -> None:
    assert (await viewer.get(BASE, params=params)).status_code == 422


async def test_rejected_seed_rows_are_absent(viewer: httpx.AsyncClient) -> None:
    # T0004551 (unknown instrument) and T0004552 (negative fee) were rejected at import.
    body = await viewer.get("/api/v1/customers/C0001/transactions", params={"page_size": 100})
    ids = [i["transaction_id"] for i in body.json()["items"]]
    assert "T0004551" not in ids
    assert ids.count("T0000026") == 1  # duplicate row in the CSV was not loaded twice
