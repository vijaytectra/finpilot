import pytest

from app.core.errors import DomainValidationError
from app.importers.csv_source import parse_csv

COLS = ("a", "b")


def test_parses_rows_with_physical_line_numbers_and_trims() -> None:
    content = b"a,b\r\n 1 , x \r\n\r\n2,\r\n"
    parsed = parse_csv("f.csv", content, COLS)
    assert [(r.line_number, r.values) for r in parsed.rows] == [
        (2, {"a": "1", "b": "x"}),
        (4, {"a": "2", "b": None}),  # blank line 3 skipped, empty value -> None
    ]
    assert parsed.size_bytes == len(content)
    assert len(parsed.sha256) == 64


def test_utf8_bom_is_accepted() -> None:
    parsed = parse_csv("f.csv", "﻿a,b\n1,2\n".encode(), COLS)
    assert parsed.rows[0].values == {"a": "1", "b": "2"}


@pytest.mark.parametrize(
    ("content", "code"),
    [
        (b"a,c\n1,2\n", "FILE_HEADER_INVALID"),
        (b"a,b,a\n1,2,3\n", "FILE_HEADER_INVALID"),
        (b"a,b\n", "FILE_EMPTY"),
        (b"a,b\n\xff\xfe,1\n", "FILE_ENCODING_INVALID"),
    ],
)
def test_structurally_invalid_files_are_refused(content: bytes, code: str) -> None:
    with pytest.raises(DomainValidationError) as exc:
        parse_csv("f.csv", content, COLS)
    assert exc.value.code == code


def test_wrong_field_count_marks_row_malformed() -> None:
    parsed = parse_csv("f.csv", b"a,b\n1\n1,2,3\n1,2\n", COLS)
    assert [r.malformed for r in parsed.rows] == [True, True, False]
