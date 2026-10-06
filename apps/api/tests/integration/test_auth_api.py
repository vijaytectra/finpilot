import httpx

from tests.integration.conftest import VIEWER


async def test_login_sets_httponly_cookie_and_never_returns_token(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post("/api/v1/auth/login", json=VIEWER)

    assert response.status_code == 200
    body = response.json()
    assert body["user"] == {
        "id": body["user"]["id"],
        "email": "viewer@finpilot.local",
        "full_name": "Demo Viewer",
        "role": "VIEWER",
    }
    assert "token" not in response.text.lower().replace("finpilot_session", "")
    cookie = response.headers["set-cookie"].lower()
    assert "finpilot_session=" in cookie
    assert "httponly" in cookie
    assert "samesite=lax" in cookie


async def test_me_requires_session(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
    assert response.json()["error"]["request_id"].startswith("req_")


async def test_me_returns_signed_in_user(viewer: httpx.AsyncClient) -> None:
    response = await viewer.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["role"] == "VIEWER"


async def test_login_email_is_case_insensitive(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={**VIEWER, "email": "  Viewer@FinPilot.LOCAL "}
    )
    assert response.status_code == 200


async def test_wrong_password_and_unknown_user_are_indistinguishable(
    client: httpx.AsyncClient,
) -> None:
    wrong = await client.post("/api/v1/auth/login", json={**VIEWER, "password": "nope"})
    unknown = await client.post(
        "/api/v1/auth/login", json={"email": "ghost@finpilot.local", "password": "nope"}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]
    assert wrong.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_tampered_cookie_is_rejected(client: httpx.AsyncClient) -> None:
    client.cookies.set("finpilot_session", "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.")
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"


async def test_logout_clears_cookie(viewer: httpx.AsyncClient) -> None:
    response = await viewer.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert 'finpilot_session=""' in response.headers["set-cookie"]
    assert (await viewer.get("/api/v1/auth/me")).status_code == 401


async def test_repeated_failures_are_rate_limited(client: httpx.AsyncClient) -> None:
    statuses = [
        (await client.post("/api/v1/auth/login", json={**VIEWER, "password": "x"})).status_code
        for _ in range(6)
    ]
    assert statuses == [401] * 5 + [429]
    blocked = await client.post("/api/v1/auth/login", json=VIEWER)
    assert blocked.status_code == 429  # even the right password, until the window passes


async def test_validation_error_envelope(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/v1/auth/login", json={"email": "x"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert {d["field"] for d in error["details"]} == {"email", "password"}
