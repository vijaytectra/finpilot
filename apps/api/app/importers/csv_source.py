"""Turns uploaded bytes into (line_number, row) pairs, refusing files whose *structure* is
wrong. Row-level problems are not decided here; they become per-row import errors later."""

import csv
import hashlib
import io
from collections.abc import Iterator
from dataclasses import dataclass

from app.core.errors import DomainValidationError

# Guard against pathological single fields (csv module default is 128 KiB).
csv.field_size_limit(64 * 1024)


@dataclass(frozen=True, slots=True)
class CsvRow:
    line_number: int  # physical line in the file, header = 1
    values: dict[str, str | None]
    malformed: bool  # wrong number of fields


@dataclass(frozen=True, slots=True)
class CsvFile:
    filename: str
    sha256: str
    size_bytes: int
    rows: list[CsvRow]


def parse_csv(filename: str, content: bytes, expected_columns: tuple[str, ...]) -> CsvFile:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise DomainValidationError(
            f"{filename} is not valid UTF-8 text", code="FILE_ENCODING_INVALID"
        ) from exc

    reader = csv.DictReader(io.StringIO(text, newline=""), restkey="__extra__")
    header = [h.strip() for h in (reader.fieldnames or [])]
    missing = [c for c in expected_columns if c not in header]
    unexpected = [c for c in header if c not in expected_columns]
    if missing or unexpected or len(header) != len(set(header)):
        raise DomainValidationError(
            f"{filename} header does not match the expected layout",
            code="FILE_HEADER_INVALID",
            details=[
                {"field": "header", "message": message}
                for message in (
                    f"missing columns: {missing}" if missing else None,
                    f"unexpected columns: {unexpected}" if unexpected else None,
                    "duplicate column names" if len(header) != len(set(header)) else None,
                )
                if message
            ],
        )
    reader.fieldnames = header

    rows: list[CsvRow] = []
    try:
        for raw in _iter(reader):
            line_number = reader.line_num
            malformed = "__extra__" in raw or any(raw.get(c) is None for c in expected_columns)
            values = {c: _clean(raw.get(c)) for c in expected_columns}
            rows.append(CsvRow(line_number, values, malformed))
    except csv.Error as exc:
        raise DomainValidationError(
            f"{filename} could not be parsed as CSV near line {reader.line_num}: {exc}",
            code="FILE_PARSE_ERROR",
        ) from exc

    if not rows:
        raise DomainValidationError(f"{filename} contains no data rows", code="FILE_EMPTY")

    return CsvFile(
        filename=filename,
        sha256=hashlib.sha256(content).hexdigest(),
        size_bytes=len(content),
        rows=rows,
    )


def _iter(reader: csv.DictReader[str]) -> Iterator[dict[str, str | None]]:
    for raw in reader:
        # Skip fully blank lines (e.g. trailing newline) instead of reporting them.
        if not any((v or "").strip() for k, v in raw.items() if k != "__extra__"):
            continue
        yield raw


def _clean(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
