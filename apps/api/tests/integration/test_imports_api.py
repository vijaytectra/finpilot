import httpx
import pytest

from app.core.config import get_settings

URL = "/api/v1/admin/imports/transactions"
HEADER = (
    "transaction_id,account_id,instrument_id,transaction_type,trade_date,quantity,price,amount,"
    "status\n"
)


def _csv(*rows: str) -> bytes:
    return (HEADER + "\n".join(rows) + "\n").encode()


async def test_viewer_cannot_import(viewer: httpx.AsyncClient) -> None:
    response = await viewer.post(URL, files={"file": ("t.csv", _csv(), "text/csv")})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


async def test_anonymous_cannot_import(client: httpx.AsyncClient) -> None:
    response = await client.post(URL, files={"file": ("t.csv", _csv(), "text/csv")})
    assert response.status_code == 401


async def test_admin_reupload_of_supplied_file_is_idempotent_with_report(
    admin: httpx.AsyncClient,
) -> None:
    content = (get_settings().data_dir / "transactions.csv").read_bytes()
    response = await admin.post(URL, files={"file": ("transactions.csv", content, "text/csv")})

    assert response.status_code == 201
    report = response.json()
    assert response.headers["location"] == f"/api/v1/admin/imports/{report['id']}"
    assert (report["inserted_rows"], report["duplicate_rows"], report["rejected_rows"]) == (
        0,
        4550,
        4,
    )
    assert report["uploaded_by"] == "admin@finpilot.local"
    assert [e["error_code"] for e in report["errors"]] == [
        "DUPLICATE_IN_FILE",
        "UNKNOWN_INSTRUMENT",
        "NEGATIVE_AMOUNT",
        "FUTURE_TRADE_DATE",
    ]
    assert report["errors"][0]["raw_data"]["transaction_id"] == "T0000026"


async def test_new_rows_import_and_errors_are_pageable(admin: httpx.AsyncClient) -> None:
    content = _csv(
        "T9300001,A00002,I0001,BUY,2026-09-01,2,100,200,SETTLED",
        "T9300002,A00002,I9999,BUY,2026-09-01,2,100,200,SETTLED",
        "T9300003,A00002,I0001,FEE,2026-09-01,0,0,-1,SETTLED",
    )
    report = (await admin.post(URL, files={"file": ("new.csv", content, "text/csv")})).json()
    assert (report["inserted_rows"], report["rejected_rows"]) == (1, 2)

    page = (
        await admin.get(f"/api/v1/admin/imports/{report['id']}/errors", params={"page_size": 1})
    ).json()
    assert page["pagination"] == {"page": 1, "page_size": 1, "total": 2, "pages": 2}
    assert page["items"][0]["line_number"] == 3

    history = (await admin.get("/api/v1/admin/imports", params={"kind": "TRANSACTIONS"})).json()
    assert history["items"][0]["id"] == report["id"]  # newest first


@pytest.mark.parametrize(
    ("filename", "content_type", "content", "status", "code"),
    [
        ("data.xlsx", "application/vnd.ms-excel", b"x", 415, "UNSUPPORTED_MEDIA_TYPE"),
        ("data.csv", "image/png", b"x", 415, "UNSUPPORTED_MEDIA_TYPE"),
        ("data.csv", "text/csv", b"a,b\n1,2\n", 422, "FILE_HEADER_INVALID"),
        ("data.csv", "text/csv", HEADER.encode(), 422, "FILE_EMPTY"),
        ("data.csv", "text/csv", b"\xff\xfe\x00", 422, "FILE_ENCODING_INVALID"),
    ],
)
async def test_structurally_invalid_uploads_are_refused(
    admin: httpx.AsyncClient,
    filename: str,
    content_type: str,
    content: bytes,
    status: int,
    code: str,
) -> None:
    response = await admin.post(URL, files={"file": (filename, content, content_type)})
    assert response.status_code == status
    assert response.json()["error"]["code"] == code


async def test_oversized_upload_is_413(
    admin: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(get_settings(), "import_max_bytes", 64)
    response = await admin.post(URL, files={"file": ("big.csv", b"x" * 65, "text/csv")})
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"


async def test_unknown_batch_is_404(admin: httpx.AsyncClient) -> None:
    response = await admin.get("/api/v1/admin/imports/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
