from datetime import date, timedelta

import httpx
import pytest

FUTURE = (date.today() + timedelta(days=3650)).isoformat()


def _goal(**overrides: object) -> dict[str, object]:
    return {
        "goal_type": "EDUCATION",
        "goal_name": "Daughter's Education",
        "target_amount": 2500000,
        "current_funded_amount": 250000.50,
        "target_date": FUTURE,
        "priority": "HIGH",
    } | overrides


async def test_list_goals_with_funded_pct_and_flags(viewer: httpx.AsyncClient) -> None:
    body = (await viewer.get("/api/v1/customers/C0005/goals")).json()
    g7 = next(g for g in body["items"] if g["goal_id"] == "G00007")
    assert g7["funded_pct"] == 15.54  # 972693.50 / 6257887.26
    assert set(g7["flags"]) == {"NAME_TYPE_MISMATCH", "HIGH_PRIORITY_UNDERFUNDED"}
    assert body["items"][0]["priority"] == "HIGH"  # HIGH first
    assert body["summary"]["goals"] == 2


async def test_create_goal_returns_201_location_and_db_assigned_id(
    viewer: httpx.AsyncClient,
) -> None:
    response = await viewer.post("/api/v1/customers/C0010/goals", json=_goal())
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["goal_id"].startswith("G00")
    assert int(body["goal_id"][1:]) > 177  # sequence continues after the seeded ids
    assert response.headers["location"] == f"/api/v1/goals/{body['goal_id']}"
    assert body["funded_pct"] == 10.0
    assert body["flags"] == ["HIGH_PRIORITY_UNDERFUNDED"]

    listed = (await viewer.get("/api/v1/customers/C0010/goals")).json()["items"]
    assert body["goal_id"] in {g["goal_id"] for g in listed}


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"target_amount": 0}, "target_amount"),
        ({"target_amount": -5}, "target_amount"),
        ({"current_funded_amount": -1}, "current_funded_amount"),
        ({"target_amount": 100.123}, "target_amount"),
        ({"goal_type": "YACHT"}, "goal_type"),
        ({"priority": "URGENT"}, "priority"),
        ({"goal_name": "   "}, "goal_name"),
        ({"target_date": "2020-01-01"}, "target_date"),
        ({"current_funded_amount": 3000000}, "current_funded_amount"),  # funded > target
    ],
)
async def test_create_goal_validation(
    viewer: httpx.AsyncClient, overrides: dict[str, object], field: str
) -> None:
    response = await viewer.post("/api/v1/customers/C0010/goals", json=_goal(**overrides))
    assert response.status_code == 422, response.text
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert field in {d["field"] for d in error["details"]}


async def test_cross_field_error_names_the_field_with_a_clean_message(
    viewer: httpx.AsyncClient,
) -> None:
    # Regression: was reported with field "" and a "Value error, " prefix.
    response = await viewer.post(
        "/api/v1/customers/C0010/goals", json=_goal(current_funded_amount=3000000)
    )
    detail = response.json()["error"]["details"][0]
    assert detail["field"] == "current_funded_amount"
    assert detail["message"] == "cannot exceed target_amount"


async def test_whole_body_error_has_null_field(viewer: httpx.AsyncClient) -> None:
    detail = (await viewer.patch("/api/v1/goals/G00001", json={})).json()["error"]["details"][0]
    assert detail["field"] is None
    assert detail["message"] == "at least one field must be provided"


async def test_create_goal_for_unknown_customer_is_404(viewer: httpx.AsyncClient) -> None:
    response = await viewer.post("/api/v1/customers/C9999/goals", json=_goal())
    assert response.status_code == 404


async def test_patch_updates_only_given_fields(viewer: httpx.AsyncClient) -> None:
    created = (await viewer.post("/api/v1/customers/C0011/goals", json=_goal())).json()
    response = await viewer.patch(
        f"/api/v1/goals/{created['goal_id']}", json={"current_funded_amount": 2500000}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["funded_pct"] == 100.0
    assert body["remaining_amount"] == 0
    assert body["goal_name"] == created["goal_name"]
    assert body["flags"] == []


async def test_patch_checks_merged_state(viewer: httpx.AsyncClient) -> None:
    created = (await viewer.post("/api/v1/customers/C0011/goals", json=_goal())).json()
    # Lowering the target below the existing funded amount must fail.
    response = await viewer.patch(
        f"/api/v1/goals/{created['goal_id']}", json={"target_amount": 1000}
    )
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "current_funded_amount"


@pytest.mark.parametrize(
    "payload", [{}, {"goal_name": None}, {"customer_id": "C0001"}, {"target_date": "2001-01-01"}]
)
async def test_patch_rejects_empty_null_unknown_or_past(
    viewer: httpx.AsyncClient, payload: dict[str, object]
) -> None:
    response = await viewer.patch("/api/v1/goals/G00001", json=payload)
    assert response.status_code == 422


async def test_patch_unknown_goal_is_404(viewer: httpx.AsyncClient) -> None:
    response = await viewer.patch("/api/v1/goals/G99999", json={"priority": "LOW"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "GOAL_NOT_FOUND"
