from datetime import time

import pytest

from app.domain.time_ranges import DurationProblem, TimeRange, duration_problem


def _range(start: str, end: str) -> TimeRange:
    return TimeRange(time.fromisoformat(start), time.fromisoformat(end))


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [
        (("10:00", "12:00"), ("11:00", "13:00"), True),
        (("10:00", "12:00"), ("09:00", "10:30"), True),
        (("10:00", "12:00"), ("10:30", "11:30"), True),  # contenida
        (("10:00", "12:00"), ("10:00", "12:00"), True),  # idéntica
        (("10:00", "12:00"), ("12:00", "14:00"), False),  # contigua: [) no se empalma
        (("10:00", "12:00"), ("08:00", "10:00"), False),
        (("07:00", "08:00"), ("15:00", "16:00"), False),
    ],
)
def test_half_open_overlap(first: tuple[str, str], second: tuple[str, str], expected: bool) -> None:
    assert _range(*first).overlaps(_range(*second)) is expected
    assert _range(*second).overlaps(_range(*first)) is expected


@pytest.mark.parametrize(
    ("start", "end", "problem"),
    [
        ("10:00", "10:00", DurationProblem.END_NOT_AFTER_START),
        ("23:00", "01:00", DurationProblem.END_NOT_AFTER_START),  # no cruza la medianoche
        ("10:00", "10:20", DurationProblem.TOO_SHORT),
        ("07:00", "13:01", DurationProblem.TOO_LONG),
        ("10:00", "10:30", None),
        ("07:00", "12:00", None),
    ],
)
def test_duration_rules(start: str, end: str, problem: DurationProblem | None) -> None:
    assert duration_problem(_range(start, end), min_minutes=30, max_minutes=300) is problem


def test_minutes_and_label() -> None:
    time_range = _range("07:00", "08:50")

    assert time_range.minutes == 110
    assert time_range.label() == "07:00–08:50"
