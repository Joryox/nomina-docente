from datetime import date, time

import pytest
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.constants import Fortnight
from app.models import Assignment, Career, HourlyRate, LogbookEntry, Teacher
from tests.factories import (
    build_logbook_entry,
    build_receipt,
    create_assignment,
    create_teacher,
)
from tests.helpers import violates

pytestmark = pytest.mark.db

SESSION_DATE = date(2026, 10, 5)
NEXT_PERIOD_DATE = date(2026, 10, 16)


@pytest.fixture
def teacher(seeded_session: Session) -> Teacher:
    return create_teacher(seeded_session)


@pytest.fixture
def assignment(
    seeded_session: Session, teacher: Teacher, career: Career, hourly_rate: HourlyRate
) -> Assignment:
    return create_assignment(seeded_session, teacher, career, hourly_rate)


@pytest.fixture
def entry(seeded_session: Session, assignment: Assignment) -> LogbookEntry:
    """Sesión del 5 de octubre de 2026 de 10:00 a 12:00."""
    entry = build_logbook_entry(assignment, SESSION_DATE, time(10), time(12))
    seeded_session.add(entry)
    seeded_session.flush()
    return entry


def _issue_first_fortnight_of_october(session: Session, teacher: Teacher) -> None:
    session.add(build_receipt(teacher, 2026, 10, Fortnight.FIRST))
    session.flush()


@pytest.mark.parametrize("end", [time(10), time(9)])
def test_end_must_be_after_start(
    seeded_session: Session, assignment: Assignment, end: time
) -> None:
    """RN-22 (con RN-17)."""
    with violates(seeded_session, "ck_logbook_entries_end_after_start"):
        seeded_session.add(build_logbook_entry(assignment, SESSION_DATE, time(10), end))


def test_overlapping_sessions_on_the_same_date_are_rejected(
    seeded_session: Session,
    entry: LogbookEntry,
    teacher: Teacher,
    other_career: Career,
    hourly_rate: HourlyRate,
) -> None:
    """RN-22: tampoco se empalman sesiones de asignaciones distintas del docente."""
    other = create_assignment(seeded_session, teacher, other_career, hourly_rate)

    with violates(seeded_session, "ex_logbook_entries_no_overlap"):
        seeded_session.add(build_logbook_entry(other, SESSION_DATE, time(11), time(13)))


def test_back_to_back_sessions_are_allowed(
    seeded_session: Session, entry: LogbookEntry, assignment: Assignment
) -> None:
    seeded_session.add(build_logbook_entry(assignment, SESSION_DATE, time(12), time(14)))
    seeded_session.flush()


def test_same_hours_on_another_date_are_allowed(
    seeded_session: Session, entry: LogbookEntry, assignment: Assignment
) -> None:
    seeded_session.add(build_logbook_entry(assignment, date(2026, 10, 6), time(10), time(12)))
    seeded_session.flush()


@pytest.mark.parametrize("notes", ["", "   ", " Repaso"])
def test_notes_must_be_trimmed_when_present(
    seeded_session: Session, assignment: Assignment, notes: str
) -> None:
    entry = build_logbook_entry(assignment, SESSION_DATE, time(10), time(12))
    entry.notes = notes

    with violates(seeded_session, "ck_logbook_entries_notes_trimmed"):
        seeded_session.add(entry)


def test_session_rate_must_exist_in_the_catalog(
    seeded_session: Session, assignment: Assignment
) -> None:
    with violates(seeded_session, "fk_logbook_entries_hourly_rate_id_hourly_rates"):
        entry = build_logbook_entry(assignment, date(2026, 10, 7), time(7), time(9))
        entry.hourly_rate_id = -1
        seeded_session.add(entry)


def test_assignment_with_logbook_cannot_be_deleted(
    seeded_session: Session, entry: LogbookEntry, assignment: Assignment
) -> None:
    """RN-15: con bitácora, la asignación solo se desactiva."""
    with violates(seeded_session, "fk_logbook_entries_assignment_id_teacher_id_assignments"):
        seeded_session.execute(delete(Assignment).where(Assignment.id == assignment.id))


class TestIssuedPeriodLock:
    """RN-23: la bitácora de un periodo con recibo emitido queda cerrada."""

    def test_new_session_in_issued_period_is_rejected(
        self, seeded_session: Session, assignment: Assignment, teacher: Teacher
    ) -> None:
        _issue_first_fortnight_of_october(seeded_session, teacher)

        with violates(seeded_session, "trg_logbook_entries_period_locked"):
            seeded_session.add(build_logbook_entry(assignment, SESSION_DATE, time(10), time(12)))

    def test_session_in_issued_period_cannot_be_edited(
        self, seeded_session: Session, entry: LogbookEntry, teacher: Teacher
    ) -> None:
        _issue_first_fortnight_of_october(seeded_session, teacher)

        with violates(seeded_session, "trg_logbook_entries_period_locked"):
            entry.end_time = time(13)

    def test_session_cannot_be_moved_into_an_issued_period(
        self, seeded_session: Session, assignment: Assignment, teacher: Teacher
    ) -> None:
        entry = build_logbook_entry(assignment, NEXT_PERIOD_DATE, time(10), time(12))
        seeded_session.add(entry)
        seeded_session.flush()
        _issue_first_fortnight_of_october(seeded_session, teacher)

        with violates(seeded_session, "trg_logbook_entries_period_locked"):
            entry.session_date = SESSION_DATE

    def test_session_in_issued_period_cannot_be_deleted(
        self, seeded_session: Session, entry: LogbookEntry, teacher: Teacher
    ) -> None:
        _issue_first_fortnight_of_october(seeded_session, teacher)

        with violates(seeded_session, "trg_logbook_entries_period_locked"):
            seeded_session.delete(entry)

    def test_other_periods_stay_open(
        self, seeded_session: Session, assignment: Assignment, teacher: Teacher
    ) -> None:
        _issue_first_fortnight_of_october(seeded_session, teacher)

        seeded_session.add(build_logbook_entry(assignment, NEXT_PERIOD_DATE, time(10), time(12)))
        seeded_session.flush()

    def test_other_teachers_stay_open(
        self, seeded_session: Session, assignment: Assignment
    ) -> None:
        _issue_first_fortnight_of_october(seeded_session, create_teacher(seeded_session))

        seeded_session.add(build_logbook_entry(assignment, SESSION_DATE, time(10), time(12)))
        seeded_session.flush()
