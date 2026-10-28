from datetime import time

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.constants import Weekday
from app.models import Assignment, Career, HourlyRate, Schedule, Teacher
from tests.factories import build_schedule, create_assignment, create_teacher
from tests.helpers import violates

pytestmark = pytest.mark.db


@pytest.fixture
def teacher(seeded_session: Session) -> Teacher:
    return create_teacher(seeded_session)


@pytest.fixture
def assignment(
    seeded_session: Session, teacher: Teacher, career: Career, hourly_rate: HourlyRate
) -> Assignment:
    """Tiene un horario el lunes de 10:00 a 12:00."""
    assignment = create_assignment(seeded_session, teacher, career, hourly_rate)
    seeded_session.add(build_schedule(assignment, Weekday.MONDAY, time(10), time(12)))
    seeded_session.flush()
    return assignment


@pytest.fixture
def other_assignment(
    seeded_session: Session, teacher: Teacher, other_career: Career, hourly_rate: HourlyRate
) -> Assignment:
    """Otra asignación del mismo docente, en otra carrera."""
    return create_assignment(seeded_session, teacher, other_career, hourly_rate)


@pytest.mark.parametrize("end", [time(7), time(6, 59)])
def test_end_must_be_after_start(
    seeded_session: Session, assignment: Assignment, end: time
) -> None:
    """RN-17: salida igual o anterior a la entrada."""
    with violates(seeded_session, "ck_schedules_end_after_start"):
        seeded_session.add(build_schedule(assignment, Weekday.TUESDAY, time(7), end))


def test_times_have_no_seconds(seeded_session: Session, assignment: Assignment) -> None:
    with violates(seeded_session, "ck_schedules_end_time_whole_minute"):
        seeded_session.add(build_schedule(assignment, Weekday.TUESDAY, time(7), time(8, 0, 30)))


@pytest.mark.parametrize("weekday", [0, 8])
def test_weekday_follows_iso_8601(
    seeded_session: Session, assignment: Assignment, weekday: int
) -> None:
    schedule = build_schedule(assignment, Weekday.TUESDAY, time(7), time(8))
    schedule.weekday = weekday

    with violates(seeded_session, "ck_schedules_weekday_iso"):
        seeded_session.add(schedule)


@pytest.mark.parametrize(
    ("start", "end"),
    [
        (time(11), time(13)),  # empieza dentro
        (time(9), time(11)),  # termina dentro
        (time(10, 30), time(11, 30)),  # queda contenido
        (time(9), time(13)),  # lo contiene
        (time(10), time(12)),  # idéntico
    ],
)
def test_overlap_between_assignments_of_the_teacher_is_rejected(
    seeded_session: Session,
    assignment: Assignment,
    other_assignment: Assignment,
    start: time,
    end: time,
) -> None:
    """RN-18: el empalme se impide entre todas las asignaciones del docente."""
    with violates(seeded_session, "ex_schedules_no_overlap"):
        seeded_session.add(build_schedule(other_assignment, Weekday.MONDAY, start, end))


@pytest.mark.parametrize(("start", "end"), [(time(12), time(14)), (time(8), time(10))])
def test_adjacent_schedules_do_not_overlap(
    seeded_session: Session,
    assignment: Assignment,
    other_assignment: Assignment,
    start: time,
    end: time,
) -> None:
    """Intervalos semiabiertos: el que termina a las 12:00 y el que empieza a las 12:00 conviven."""
    seeded_session.add(build_schedule(other_assignment, Weekday.MONDAY, start, end))
    seeded_session.flush()


def test_an_assignment_can_have_several_schedules_on_the_same_day(
    seeded_session: Session, assignment: Assignment
) -> None:
    """RN-16: una clase puede repetirse el mismo día a otra hora (por ejemplo, dos bloques)."""
    for start, end in ((time(7), time(9)), (time(14), time(16))):
        seeded_session.add(build_schedule(assignment, Weekday.MONDAY, start, end))
    seeded_session.flush()

    count = select(func.count()).where(Schedule.assignment_id == assignment.id)
    assert seeded_session.scalar(count) == 3  # con el de 10:00 a 12:00 del fixture


def test_same_hours_on_another_day_are_allowed(
    seeded_session: Session, assignment: Assignment, other_assignment: Assignment
) -> None:
    seeded_session.add(build_schedule(other_assignment, Weekday.TUESDAY, time(10), time(12)))
    seeded_session.flush()


def test_same_hours_for_another_teacher_are_allowed(
    seeded_session: Session, assignment: Assignment, career: Career, hourly_rate: HourlyRate
) -> None:
    colleague = create_assignment(
        seeded_session, create_teacher(seeded_session), career, hourly_rate
    )

    seeded_session.add(build_schedule(colleague, Weekday.MONDAY, time(10), time(12)))
    seeded_session.flush()


def test_teacher_must_match_the_assignment(seeded_session: Session, assignment: Assignment) -> None:
    """La copia de ``teacher_id`` no puede divergir de la asignación (llave compuesta)."""
    schedule = build_schedule(assignment, Weekday.TUESDAY, time(7), time(8))
    schedule.teacher_id = create_teacher(seeded_session).id

    with violates(seeded_session, "fk_schedules_assignment_id_teacher_id_assignments"):
        seeded_session.add(schedule)


def test_schedules_are_removed_with_their_assignment(
    seeded_session: Session, assignment: Assignment
) -> None:
    """RN-15: una asignación sin bitácora se borra junto con sus horarios."""
    seeded_session.execute(delete(Assignment).where(Assignment.id == assignment.id))

    remaining = select(func.count()).where(Schedule.assignment_id == assignment.id)
    assert seeded_session.scalar(remaining) == 0
