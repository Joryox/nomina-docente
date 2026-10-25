import pytest
from sqlalchemy.orm import Session

from app.models import Teacher
from tests.factories import create_teacher, create_user
from tests.helpers import violates

pytestmark = pytest.mark.db


def test_employee_number_is_unique_when_captured(db_session: Session) -> None:
    """RN-03: el número de empleado es opcional, pero no se repite."""
    create_teacher(db_session, employee_number="TESH-0001")

    with violates(db_session, "uq_teachers_employee_number"):
        create_teacher(db_session, employee_number="TESH-0001")


def test_several_teachers_can_omit_employee_number(db_session: Session) -> None:
    first = create_teacher(db_session)
    second = create_teacher(db_session)

    assert first.employee_number is None
    assert second.employee_number is None


def test_user_has_at_most_one_teacher_profile(db_session: Session) -> None:
    teacher = create_teacher(db_session)

    with violates(db_session, "uq_teachers_user_id"):
        db_session.add(
            Teacher(user_id=teacher.user_id, first_names="Luis", paternal_surname="Pérez")
        )


@pytest.mark.parametrize("first_names", ["", "  ", " Ana"])
def test_names_must_be_trimmed_and_not_blank(db_session: Session, first_names: str) -> None:
    user = create_user(db_session)

    with violates(db_session, "ck_teachers_first_names_trimmed"):
        db_session.add(Teacher(user_id=user.id, first_names=first_names, paternal_surname="Pérez"))


def test_user_with_teacher_profile_cannot_be_deleted(db_session: Session) -> None:
    teacher = create_teacher(db_session)

    with violates(db_session, "fk_teachers_user_id_users"):
        db_session.delete(teacher.user)
