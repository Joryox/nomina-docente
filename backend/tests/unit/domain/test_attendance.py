from datetime import date, time

import pytest

from app.domain.attendance import (
    RecordedSession,
    ScheduledSlot,
    ScheduleMatch,
    is_due,
    occurrences,
    schedule_match,
)
from app.domain.time_ranges import TimeRange

MONDAY = date(2026, 10, 19)
TUESDAY = date(2026, 10, 20)


def _range(start: str, end: str) -> TimeRange:
    return TimeRange(time.fromisoformat(start), time.fromisoformat(end))


SLOTS = [
    ScheduledSlot(slot_key=1, assignment_key=10, weekday=1, time_range=_range("07:00", "09:00")),
    ScheduledSlot(slot_key=2, assignment_key=20, weekday=1, time_range=_range("10:00", "12:00")),
    ScheduledSlot(slot_key=3, assignment_key=10, weekday=2, time_range=_range("07:00", "09:00")),
]


def test_occurrences_match_sessions_of_the_same_assignment_that_overlap() -> None:
    sessions = [
        RecordedSession(
            entry_key=100, assignment_key=10, day=MONDAY, time_range=_range("07:10", "08:50")
        ),
        # Otra asignación a la misma hora: no cuenta para el horario 1.
        RecordedSession(
            entry_key=101, assignment_key=20, day=TUESDAY, time_range=_range("07:00", "09:00")
        ),
    ]

    result = occurrences(SLOTS, sessions, [MONDAY, TUESDAY])

    assert [(o.day, o.slot.slot_key, o.registered) for o in result] == [
        (MONDAY, 1, True),
        (MONDAY, 2, False),
        (TUESDAY, 3, False),
    ]
    assert result[0].session is not None and result[0].session.entry_key == 100


@pytest.mark.parametrize(
    ("day", "end", "now", "expected"),
    [
        (date(2026, 10, 20), time(21), time(8), True),  # ayer
        (date(2026, 10, 21), time(17), time(18), True),  # hoy, ya terminó
        (date(2026, 10, 21), time(18), time(18), True),  # termina justo ahora
        (date(2026, 10, 21), time(21), time(18), False),  # hoy, aún no termina
        (date(2026, 10, 22), time(7), time(18), False),  # mañana
    ],
)
def test_is_due(day: date, end: time, now: time, expected: bool) -> None:
    assert is_due(day, end, date(2026, 10, 21), now) is expected


@pytest.mark.parametrize(
    ("assignment", "day", "session_range", "expected"),
    [
        (10, MONDAY, ("07:00", "09:00"), ScheduleMatch.EXACT),
        (10, MONDAY, ("07:00", "08:50"), ScheduleMatch.DIFFERENT_TIMES),
        (20, TUESDAY, ("10:00", "12:00"), ScheduleMatch.NOT_SCHEDULED),
        (30, MONDAY, ("07:00", "09:00"), ScheduleMatch.NOT_SCHEDULED),
    ],
)
def test_schedule_match(
    assignment: int, day: date, session_range: tuple[str, str], expected: ScheduleMatch
) -> None:
    assert schedule_match(assignment, day, _range(*session_range), SLOTS) is expected
