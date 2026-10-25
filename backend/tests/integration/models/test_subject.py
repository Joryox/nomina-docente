import pytest
from sqlalchemy.orm import Session

from app.models import Subject
from tests.factories import create_subject, create_teacher
from tests.helpers import violates

pytestmark = pytest.mark.db


def test_database_normalizes_the_name(db_session: Session) -> None:
    subject = create_subject(db_session, create_teacher(db_session), "Programación  Lógica")
    db_session.refresh(subject)

    assert subject.name == "Programación  Lógica"
    assert subject.name_normalized == "programacion logica"


@pytest.mark.parametrize("variant", ["BASES DE DATOS", "Bases  de   Datos", "Bases de Dátos"])
def test_teacher_cannot_repeat_a_subject_name(db_session: Session, variant: str) -> None:
    """RN-09: sin distinguir mayúsculas, acentos ni espacios repetidos."""
    teacher = create_teacher(db_session)
    create_subject(db_session, teacher, "Bases de Datos")

    with violates(db_session, "uq_subjects_teacher_id_name_normalized"):
        db_session.add(Subject(teacher_id=teacher.id, name=variant))


def test_different_teachers_can_use_the_same_name(db_session: Session) -> None:
    create_subject(db_session, create_teacher(db_session), "Bases de Datos")
    subject = create_subject(db_session, create_teacher(db_session), "Bases de Datos")

    assert subject.id is not None


@pytest.mark.parametrize("name", ["", " Bases de Datos", "Bases de Datos "])
def test_name_must_be_trimmed_and_not_blank(db_session: Session, name: str) -> None:
    teacher = create_teacher(db_session)

    with violates(db_session, "ck_subjects_name_trimmed"):
        db_session.add(Subject(teacher_id=teacher.id, name=name))
