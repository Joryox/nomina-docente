from collections.abc import Callable
from http import HTTPStatus

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import AuthSession, Teacher, User
from app.repositories.teacher import TeacherRepository
from app.repositories.user import UserRepository
from tests.auth import AUTH, csrf_headers, error_code, register, registration

pytestmark = pytest.mark.db


def _count(session: Session, model: type[User | Teacher | AuthSession]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_creates_account_profile_role_and_session(
    browser: TestClient, settings: Settings, db_session: Session
) -> None:
    response = register(browser, settings, email="  Ana.Garcia@TESH.edu.mx ")

    assert response.status_code == HTTPStatus.CREATED
    body = response.json()
    assert body["account"]["email"] == "ana.garcia@tesh.edu.mx"
    assert body["account"]["roles"] == ["teacher"]
    assert body["teacher"]["full_name"] == "Ana María García López"
    user = UserRepository(db_session).get_by_email("ana.garcia@tesh.edu.mx")
    assert user is not None
    assert user.password_hash.startswith("$argon2id$")
    assert user.teacher is not None
    assert _count(db_session, AuthSession) == 1


def test_sets_session_cookies(browser: TestClient, settings: Settings) -> None:
    response = register(browser, settings)

    cookies = {cookie.name: cookie for cookie in browser.cookies.jar}
    assert {
        settings.access_cookie_name,
        settings.refresh_cookie_name,
        settings.session_hint_cookie_name,
    } <= cookies.keys()
    assert cookies[settings.refresh_cookie_name].path == "/api/v1/auth"
    set_cookie = response.headers.get_list("set-cookie")
    session_cookies = [c for c in set_cookie if not c.startswith(settings.csrf_cookie_name)]
    assert all("HttpOnly" in cookie and "SameSite=lax" in cookie for cookie in session_cookies)
    csrf_cookie = next(c for c in set_cookie if c.startswith(settings.csrf_cookie_name))
    assert "HttpOnly" not in csrf_cookie


def test_registered_teacher_can_read_their_account(browser: TestClient, settings: Settings) -> None:
    register(browser, settings)

    response = browser.get(f"{AUTH}/me")

    assert response.status_code == HTTPStatus.OK
    assert response.json()["teacher"]["employee_number"] == "TESH-0042"


@pytest.mark.parametrize("email", ["ana.garcia@tesh.edu.mx", "ANA.GARCIA@tesh.edu.mx"])
def test_duplicate_email_is_rejected_ignoring_case(
    make_client: Callable[[], TestClient], settings: Settings, email: str
) -> None:
    """RN-02."""
    register(make_client(), settings)

    response = register(make_client(), settings, email=email, employee_number=None)

    assert response.status_code == HTTPStatus.CONFLICT
    assert error_code(response) == "EMAIL_ALREADY_REGISTERED"
    assert "Ya existe una cuenta con este correo" in response.json()["error"]["message"]


def test_duplicate_employee_number_is_rejected(
    make_client: Callable[[], TestClient], settings: Settings
) -> None:
    """RN-03."""
    register(make_client(), settings)

    response = register(make_client(), settings, email="luis@tesh.edu.mx")

    assert response.status_code == HTTPStatus.CONFLICT
    assert error_code(response) == "EMPLOYEE_NUMBER_ALREADY_REGISTERED"


@pytest.mark.parametrize(
    ("password", "rules"),
    [
        ("Corta-2026", ["min_length"]),
        ("solo-letras-sin-numeros", ["digit_required"]),
        ("123456789012345", ["letter_required"]),
        ("Garcia-Docente-2026", ["no_personal_data"]),
        ("Password1234", ["not_common"]),
        ("ana.garcia2026x", ["no_personal_data"]),
    ],
)
def test_weak_password_is_rejected_with_the_broken_rules(
    browser: TestClient, settings: Settings, password: str, rules: list[str]
) -> None:
    response = register(browser, settings, password=password)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert error_code(response) == "PASSWORD_POLICY_VIOLATION"
    assert response.json()["error"]["details"]["rules"] == rules


def test_unknown_fields_are_rejected(browser: TestClient, settings: Settings) -> None:
    response = browser.post(
        f"{AUTH}/register",
        json=registration(is_admin=True),
        headers=csrf_headers(browser, settings),
    )

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    field = response.json()["error"]["details"]["fields"][0]
    assert field["location"] == ["body", "is_admin"]
    assert field["message"] == "Este campo no se admite."


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "sin-arroba"},
        {"first_names": "Ana2"},
        {"paternal_surname": "   "},
        {"employee_number": "TESH 0042"},
    ],
)
def test_invalid_fields_are_rejected(
    browser: TestClient, settings: Settings, overrides: dict[str, str]
) -> None:
    response = register(browser, settings, **overrides)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert error_code(response) == "VALIDATION_ERROR"


def test_validation_errors_never_echo_the_password(browser: TestClient, settings: Settings) -> None:
    secret = "Contraseña-Secreta-2026"
    response = register(browser, settings, password=secret, email="no-es-correo")

    assert secret not in response.text


def test_names_are_stored_with_single_spaces(
    browser: TestClient, settings: Settings, db_session: Session
) -> None:
    register(
        browser, settings, first_names="  Ana    María ", maternal_surname="", employee_number=""
    )

    teacher = TeacherRepository(db_session).get_by_employee_number("TESH-0042")
    user = UserRepository(db_session).get_by_email("ana.garcia@tesh.edu.mx")
    assert teacher is None
    assert user is not None
    assert user.teacher is not None
    assert user.teacher.first_names == "Ana María"
    assert user.teacher.maternal_surname is None


def test_failure_after_creating_the_user_leaves_nothing_behind(
    browser: TestClient,
    settings: Settings,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """La cuenta, el perfil, el rol y la sesión se crean juntos o no se crea nada."""
    users_before = _count(db_session, User)

    def fail(*_: object) -> None:
        raise RuntimeError("falla simulada al crear el perfil")

    monkeypatch.setattr(TeacherRepository, "add", fail)
    with pytest.raises(RuntimeError):
        register(browser, settings)

    assert _count(db_session, User) == users_before
    assert _count(db_session, Teacher) == 0
    assert _count(db_session, AuthSession) == 0
