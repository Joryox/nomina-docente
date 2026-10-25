from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models import User, UserRole
from app.repositories.role import RoleRepository
from tests.factories import create_user
from tests.helpers import violates

pytestmark = pytest.mark.db


def test_database_assigns_identifiers_and_timestamps(db_session: Session) -> None:
    user = create_user(db_session)
    db_session.refresh(user)

    assert user.id > 0
    assert user.public_id is not None
    assert user.is_active is True
    assert user.created_at.tzinfo is not None


def test_duplicate_email_is_rejected(db_session: Session) -> None:
    create_user(db_session, "docente@tesh.edu.mx")

    with violates(db_session, "uq_users_email"):
        db_session.add(User(email="docente@tesh.edu.mx", password_hash="x"))


@pytest.mark.parametrize(
    ("variant", "constraint"),
    [
        ("Docente@TESH.edu.mx", "ck_users_email_normalized"),
        # PostgreSQL evalúa los CHECK en orden alfabético: el formato rechaza antes el espacio.
        (" docente@tesh.edu.mx", "ck_users_email_format"),
    ],
)
def test_email_must_be_stored_normalized(
    db_session: Session, variant: str, constraint: str
) -> None:
    """RN-02: con el correo normalizado, el UNIQUE ya no distingue mayúsculas ni espacios."""
    create_user(db_session, "docente@tesh.edu.mx")

    with violates(db_session, constraint):
        db_session.add(User(email=variant, password_hash="x"))


def test_email_without_at_sign_is_rejected(db_session: Session) -> None:
    with violates(db_session, "ck_users_email_format"):
        db_session.add(User(email="docente.tesh.edu.mx", password_hash="x"))


def test_updated_at_is_set_by_the_database(db_session: Session) -> None:
    user = create_user(db_session)
    stale = datetime(2000, 1, 1, tzinfo=UTC)

    user.updated_at = stale
    user.is_active = False
    db_session.flush()
    db_session.refresh(user)

    assert user.updated_at == db_session.scalar(select(func.now()))


def test_roles_are_removed_with_their_user(seeded_session: Session) -> None:
    role = RoleRepository(seeded_session).get_by_code(RoleCode.TEACHER)
    assert role is not None
    user = create_user(seeded_session)
    seeded_session.add(UserRole(user_id=user.id, role_id=role.id))
    seeded_session.flush()

    seeded_session.delete(user)
    seeded_session.flush()

    assert seeded_session.scalar(select(func.count()).select_from(UserRole)) == 0
