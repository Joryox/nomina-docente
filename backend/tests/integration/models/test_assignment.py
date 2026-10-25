from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.models import Assignment, Career, HourlyRate
from tests.factories import create_assignment, create_subject, create_teacher
from tests.helpers import violates

pytestmark = pytest.mark.db

UNKNOWN_ID = 0


def test_rate_outside_the_catalog_is_rejected(seeded_session: Session, career: Career) -> None:
    """RN-11: la tarifa solo puede salir del catálogo ``hourly_rates``."""
    teacher = create_teacher(seeded_session)
    subject = create_subject(seeded_session, teacher)

    with violates(seeded_session, "fk_assignments_hourly_rate_id_hourly_rates"):
        seeded_session.add(
            Assignment(
                teacher_id=teacher.id,
                subject_id=subject.id,
                career_id=career.id,
                hourly_rate_id=UNKNOWN_ID,
            )
        )


def test_career_outside_the_catalog_is_rejected(
    seeded_session: Session, hourly_rate: HourlyRate
) -> None:
    teacher = create_teacher(seeded_session)
    subject = create_subject(seeded_session, teacher)

    with violates(seeded_session, "fk_assignments_career_id_careers"):
        seeded_session.add(
            Assignment(
                teacher_id=teacher.id,
                subject_id=subject.id,
                career_id=UNKNOWN_ID,
                hourly_rate_id=hourly_rate.id,
            )
        )


def test_subject_must_belong_to_the_same_teacher(
    seeded_session: Session, career: Career, hourly_rate: HourlyRate
) -> None:
    """RN-04 en la base: no se puede armar una asignación con la materia de otro docente."""
    teacher = create_teacher(seeded_session)
    foreign_subject = create_subject(seeded_session, create_teacher(seeded_session))

    with violates(seeded_session, "fk_assignments_subject_id_teacher_id_subjects"):
        seeded_session.add(
            Assignment(
                teacher_id=teacher.id,
                subject_id=foreign_subject.id,
                career_id=career.id,
                hourly_rate_id=hourly_rate.id,
            )
        )


def test_same_subject_and_career_cannot_be_active_twice(
    seeded_session: Session, career: Career, hourly_rate: HourlyRate
) -> None:
    """RN-14."""
    assignment = create_assignment(
        seeded_session, create_teacher(seeded_session), career, hourly_rate
    )

    with violates(seeded_session, "uq_assignments_active_teacher_subject_career"):
        seeded_session.add(
            Assignment(
                teacher_id=assignment.teacher_id,
                subject_id=assignment.subject_id,
                career_id=career.id,
                hourly_rate_id=hourly_rate.id,
            )
        )


def test_inactive_assignment_allows_a_new_one(
    seeded_session: Session, career: Career, hourly_rate: HourlyRate
) -> None:
    """Desactivar conserva el historial y permite reasignar, por ejemplo con otra tarifa."""
    assignment = create_assignment(
        seeded_session, create_teacher(seeded_session), career, hourly_rate
    )
    assignment.is_active = False
    assignment.active_until = date(2026, 10, 20)
    seeded_session.flush()

    replacement = Assignment(
        teacher_id=assignment.teacher_id,
        subject_id=assignment.subject_id,
        career_id=career.id,
        hourly_rate_id=hourly_rate.id,
    )
    seeded_session.add(replacement)
    seeded_session.flush()

    assert replacement.id != assignment.id


def test_same_subject_can_be_taught_in_several_careers(
    seeded_session: Session, career: Career, other_career: Career, hourly_rate: HourlyRate
) -> None:
    """RN-08."""
    teacher = create_teacher(seeded_session)
    subject = create_subject(seeded_session, teacher)

    first = create_assignment(seeded_session, teacher, career, hourly_rate, subject)
    second = create_assignment(seeded_session, teacher, other_career, hourly_rate, subject)

    assert first.subject_id == second.subject_id


def test_rate_in_use_cannot_be_deleted(
    seeded_session: Session, career: Career, hourly_rate: HourlyRate
) -> None:
    create_assignment(seeded_session, create_teacher(seeded_session), career, hourly_rate)

    with violates(seeded_session, "fk_assignments_hourly_rate_id_hourly_rates"):
        seeded_session.delete(hourly_rate)


@pytest.mark.parametrize(("is_active", "active_until"), [(True, date(2026, 10, 20)), (False, None)])
def test_active_until_exists_only_when_inactive(
    seeded_session: Session,
    career: Career,
    hourly_rate: HourlyRate,
    is_active: bool,
    active_until: date | None,
) -> None:
    assignment = create_assignment(
        seeded_session, create_teacher(seeded_session), career, hourly_rate
    )

    with violates(seeded_session, "ck_assignments_active_until_consistent"):
        assignment.is_active = is_active
        assignment.active_until = active_until
