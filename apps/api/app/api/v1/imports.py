import uuid
from typing import Annotated

from fastapi import APIRouter, File, Response, UploadFile, status

from app.api.deps import AdminUser, PageParam, PageSizeParam, SessionDep, SettingsDep
from app.models.enums import ImportKind
from app.schemas.common import error_responses
from app.schemas.imports import ImportBatchOut, ImportBatchPage, ImportErrorPage, ImportReport
from app.services.imports import ImportService

router = APIRouter(prefix="/admin/imports", tags=["admin: imports"])

# Real response: re-upload of the supplied transactions.csv after seeding (errors truncated
# to two of the four, raw_data abridged).
_REPORT_EXAMPLE = {
    "id": "e1b20da2-5727-4c3d-94c3-01aed1d1d4e7",
    "kind": "TRANSACTIONS",
    "source": "UPLOAD",
    "status": "COMPLETED",
    "filename": "transactions.csv",
    "file_sha256": "0096865ae283c06b14ebef5f74aed8ebc7692af5722aba664c26d16a641499b6",
    "file_bytes": 304663,
    "uploaded_by": "admin@finpilot.local",
    "total_rows": 4554,
    "inserted_rows": 0,
    "duplicate_rows": 4550,
    "rejected_rows": 4,
    "error_message": None,
    "started_at": "2026-10-06T12:39:48.424036Z",
    "completed_at": "2026-10-06T12:39:48.433073Z",
    "errors_total": 4,
    "errors_truncated": False,
    "errors": [
        {
            "line_number": 4552,
            "severity": "REJECTED",
            "error_code": "DUPLICATE_IN_FILE",
            "field": "transaction_id",
            "message": "transaction_id T0000026 already appears on line 27",
            "raw_data": {"transaction_id": "T0000026", "amount": "16686.83", "status": "SETTLED"},
        },
        {
            "line_number": 4553,
            "severity": "REJECTED",
            "error_code": "UNKNOWN_INSTRUMENT",
            "field": "instrument_id",
            "message": "instrument_id I9999 does not exist",
            "raw_data": {"transaction_id": "T0004551", "instrument_id": "I9999", "amount": "1000"},
        },
    ],
}


def _service(session: SessionDep, settings: SettingsDep) -> ImportService:
    return ImportService(session, settings)


@router.post(
    "/transactions",
    response_model=ImportReport,
    status_code=status.HTTP_201_CREATED,
    summary="Validate and import a transactions CSV (ADMIN)",
    description=(
        "Pipeline: structural checks (size, type, UTF-8, exact header) -> COPY into a "
        "staging table -> SQL rule validation -> merge valid rows, in one DB transaction.\n\n"
        "* Rows with any rule violation are **rejected** with line number and reason; the "
        "rest are imported (partial acceptance).\n"
        "* Rows already present with identical values are counted as `duplicate_rows` and "
        "skipped, so re-uploading a file is idempotent.\n"
        "* A known `transaction_id` with *different* values is rejected "
        "(`CONFLICTS_WITH_EXISTING`), never overwritten.\n"
        "* A structurally invalid file is refused as a whole with 413/415/422.\n\n"
        "The response returns up to 500 row errors; page through all of them with "
        "`GET /admin/imports/{id}/errors`."
    ),
    responses={
        201: {"content": {"application/json": {"example": _REPORT_EXAMPLE}}},
        **error_responses(401, 403, 413, 415, 422),
    },
)
async def upload_transactions(
    file: Annotated[UploadFile, File(description="transactions CSV, UTF-8, max 25 MB")],
    admin: AdminUser,
    session: SessionDep,
    settings: SettingsDep,
    response: Response,
) -> ImportReport:
    report = await _service(session, settings).upload_transactions(file, admin.id)
    response.headers["Location"] = f"/api/v1/admin/imports/{report.id}"
    return report


@router.get(
    "",
    response_model=ImportBatchPage,
    summary="Import history (seed and uploads), newest first (ADMIN)",
    responses=error_responses(401, 403, 422),
)
async def list_imports(
    _: AdminUser,
    session: SessionDep,
    settings: SettingsDep,
    kind: ImportKind | None = None,
    page: PageParam = 1,
    page_size: PageSizeParam = 20,
) -> ImportBatchPage:
    return await _service(session, settings).batches(kind.value if kind else None, page, page_size)


@router.get(
    "/{batch_id}",
    response_model=ImportBatchOut,
    summary="One import batch (ADMIN)",
    responses=error_responses(401, 403, 404, 422),
)
async def get_import(
    batch_id: uuid.UUID, _: AdminUser, session: SessionDep, settings: SettingsDep
) -> ImportBatchOut:
    return await _service(session, settings).batch(batch_id)


@router.get(
    "/{batch_id}/errors",
    response_model=ImportErrorPage,
    summary="Row-level rejections of a batch, by line number (ADMIN)",
    responses=error_responses(401, 403, 404, 422),
)
async def list_import_errors(
    batch_id: uuid.UUID,
    _: AdminUser,
    session: SessionDep,
    settings: SettingsDep,
    page: PageParam = 1,
    page_size: PageSizeParam = 50,
) -> ImportErrorPage:
    return await _service(session, settings).errors(batch_id, page, page_size)
