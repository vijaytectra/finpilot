import httpx


async def test_overview_aggregates(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get("/api/v1/reports/overview")).json()

    headline = body["headline"]
    assert (headline["customers"], headline["accounts"], headline["active_accounts"]) == (
        120,
        167,
        155,
    )
    assert headline["customers_with_holdings"] == 113
    assert headline["aum"] == 52754963.60  # duplicates excluded; matches raw-CSV recomputation
    assert headline["snapshot_date"] == "2026-09-18"

    assert [c["customer_id"] for c in body["top_customers"][:3]] == ["C0026", "C0100", "C0008"]
    assert len(body["top_customers"]) == 10
    assert abs(sum(a["weight_pct"] for a in body["allocation"]) - 100) < 0.05
    assert len(body["monthly_net_flows"]) == 12
    assert body["top_instruments_by_holders"][0]["instrument_id"] == "I0049"
    assert len(body["high_priority_underfunded_goals"]) >= 12
    assert all(g["funded_pct"] < 25 for g in body["high_priority_underfunded_goals"])


async def test_data_quality_counts_are_not_inflated_by_reimports(
    viewer: httpx.AsyncClient,
) -> None:
    rules = {
        (r["entity"], r["rule"]): r["count"]
        for r in (await viewer.get("/api/v1/reports/overview")).json()["data_quality"]
    }
    assert rules[("HOLDINGS", "DUPLICATE_IN_FILE")] == 3
    assert rules[("TRANSACTIONS", "UNKNOWN_INSTRUMENT")] >= 1
    assert rules[("TRANSACTIONS", "TRADE_BEFORE_ACCOUNT_OPENED")] == 1069
