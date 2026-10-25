import pytest

from app.core.constants import Fortnight
from app.utils.folio import build_folio


@pytest.mark.parametrize(
    ("year", "month", "fortnight", "number", "expected"),
    [
        (2026, 10, Fortnight.SECOND, 42, "NOM-202610-Q2-000042"),
        (2027, 1, Fortnight.FIRST, 1, "NOM-202701-Q1-000001"),
        (2027, 1, Fortnight.FIRST, 999_999, "NOM-202701-Q1-999999"),
    ],
)
def test_builds_the_documented_format(
    year: int, month: int, fortnight: Fortnight, number: int, expected: str
) -> None:
    """RN-30."""
    assert build_folio("NOM", year, month, fortnight, number) == expected


def test_uses_the_configured_prefix() -> None:
    assert build_folio("TESH", 2026, 10, Fortnight.FIRST, 7) == "TESH-202610-Q1-000007"


def test_number_beyond_the_padding_is_never_truncated() -> None:
    assert build_folio("NOM", 2026, 10, Fortnight.FIRST, 1_234_567) == "NOM-202610-Q1-1234567"
