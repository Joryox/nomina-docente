"""Repositorios que usará la autenticación (etapa 3): usuarios, roles y docentes."""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.core.constants import RoleCode
from app.models import Teacher, User
from app.repositories.role import RoleRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.user import UserRepository
from tests.factories import create_teacher, create_user

pytestmark = pytest.mark.db


class TestUserRepository:
    def test_add_returns_the_user_with_database_defaults(self, db_session: Session) -> None:
        user = UserRepository(db_session).add(User(email="nuevo@tesh.edu.mx", password_hash="hash"))

        assert user.id is not None
        assert isinstance(user.public_id, uuid.UUID)

    def test_get_by_email(self, db_session: Session) -> None:
        user = create_user(db_session, "ana@tesh.edu.mx")
        repository = UserRepository(db_session)

        assert repository.get_by_email("ana@tesh.edu.mx") is user
        assert repository.get_by_email("otra@tesh.edu.mx") is None

    def test_get_by_public_id(self, db_session: Session) -> None:
        user = create_user(db_session)
        db_session.refresh(user)
        repository = UserRepository(db_session)

        assert repository.get_by_public_id(user.public_id) is user
        assert repository.get_by_public_id(uuid.uuid4()) is None

    def test_get_by_id(self, db_session: Session) -> None:
        user = create_user(db_session)

        assert UserRepository(db_session).get(user.id) is user

    def test_roles_are_granted_through_the_relationship(self, seeded_session: Session) -> None:
        role = RoleRepository(seeded_session).get_by_code(RoleCode.TEACHER)
        assert role is not None
        user = create_user(seeded_session)

        user.roles.append(role)
        seeded_session.flush()
        seeded_session.expire(user)

        assert [granted.code for granted in user.roles] == [RoleCode.TEACHER]


class TestRoleRepository:
    def test_every_role_code_known_by_the_code_is_seeded(self, seeded_session: Session) -> None:
        repository = RoleRepository(seeded_session)

        assert all(repository.get_by_code(code) is not None for code in RoleCode)

    def test_unknown_code(self, seeded_session: Session) -> None:
        assert RoleRepository(seeded_session).get_by_code("auditor") is None


class TestTeacherRepository:
    def test_get_by_user_id(self, db_session: Session) -> None:
        teacher = create_teacher(db_session)
        repository = TeacherRepository(db_session)

        assert repository.get_by_user_id(teacher.user_id) is teacher
        assert repository.get_by_user_id(0) is None

    def test_get_by_employee_number(self, db_session: Session) -> None:
        teacher = create_teacher(db_session, employee_number="TESH-0042")
        repository = TeacherRepository(db_session)

        assert repository.get_by_employee_number("TESH-0042") is teacher
        assert repository.get_by_employee_number("TESH-9999") is None

    def test_profile_is_reachable_from_the_user(self, db_session: Session) -> None:
        teacher = create_teacher(db_session)
        user = db_session.get_one(User, teacher.user_id)

        assert isinstance(user.teacher, Teacher)
        assert user.teacher is teacher
