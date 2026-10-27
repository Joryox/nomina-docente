from collections.abc import Callable
from datetime import timedelta
from http import HTTPStatus

import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.repositories.user import UserRepository
from app.services.auth import INVALID_CREDENTIALS_MESSAGE
from tests.auth import VALID_PASSWORD, error_code, login, register
from tests.helpers import FakeClock

pytestmark = pytest.mark.db

EMAIL = "ana.garcia@tesh.edu.mx"


@pytest.fixture
def registered(make_client: Callable[[], TestClient], settings: Settings) -> None:
    register(make_client(), settings)


@pytest.mark.usefixtures("registered")
class TestLogin:
    def test_correct_credentials_start_a_session(
        self, browser: TestClient, settings: Settings, db_session: Session
    ) -> None:
        response = login(browser, settings, email="  ANA.GARCIA@tesh.edu.mx")

        assert response.status_code == HTTPStatus.OK
        assert response.json()["teacher"]["first_names"] == "Ana María"
        assert browser.get("/api/v1/auth/me").status_code == HTTPStatus.OK
        user = UserRepository(db_session).get_by_email(EMAIL)
        assert user is not None
        assert user.last_login_at is not None

    @pytest.mark.parametrize(
        ("email", "password"),
        [(EMAIL, "Contraseña-Equivocada-1"), ("nadie@tesh.edu.mx", VALID_PASSWORD)],
    )
    def test_wrong_password_and_unknown_email_get_the_same_answer(
        self, browser: TestClient, settings: Settings, email: str, password: str
    ) -> None:
        """No se revela si el correo existe."""
        response = login(browser, settings, email=email, password=password)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert response.json() == {
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": INVALID_CREDENTIALS_MESSAGE,
                "details": {},
            }
        }
        assert settings.access_cookie_name not in browser.cookies

    def test_account_locks_after_max_failed_attempts_and_unlocks_later(
        self, browser: TestClient, settings: Settings, clock: FakeClock
    ) -> None:
        for _ in range(settings.login_max_failed_attempts):
            login(browser, settings, password="Contraseña-Equivocada-1")

        locked = login(browser, settings)
        assert locked.status_code == HTTPStatus.UNAUTHORIZED
        assert error_code(locked) == "ACCOUNT_LOCKED"
        assert locked.json()["error"]["details"] == {
            "retry_after_seconds": settings.login_lockout_minutes * 60
        }

        clock.advance(timedelta(minutes=settings.login_lockout_minutes, seconds=1))
        assert login(browser, settings).status_code == HTTPStatus.OK

    def test_locked_account_with_wrong_password_gets_the_generic_error(
        self, browser: TestClient, settings: Settings, clock: FakeClock
    ) -> None:
        """El bloqueo solo se revela a quien conoce la contraseña: no permite enumerar."""
        for _ in range(settings.login_max_failed_attempts):
            login(browser, settings, password="Contraseña-Equivocada-1")
        clock.advance(timedelta(minutes=1))

        response = login(browser, settings, password="Contraseña-Equivocada-1")

        assert error_code(response) == "INVALID_CREDENTIALS"
        remaining = login(browser, settings).json()["error"]["details"]["retry_after_seconds"]
        assert remaining == (settings.login_lockout_minutes - 1) * 60

    def test_successful_login_resets_the_failed_attempts(
        self, browser: TestClient, settings: Settings, db_session: Session
    ) -> None:
        for _ in range(settings.login_max_failed_attempts - 1):
            login(browser, settings, password="Contraseña-Equivocada-1")
        login(browser, settings)

        user = UserRepository(db_session).get_by_email(EMAIL)
        assert user is not None
        assert user.failed_login_attempts == 0
        assert user.locked_until is None

    def test_inactive_account_cannot_log_in(
        self, browser: TestClient, settings: Settings, db_session: Session
    ) -> None:
        user = UserRepository(db_session).get_by_email(EMAIL)
        assert user is not None
        user.is_active = False
        db_session.flush()

        response = login(browser, settings)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert error_code(response) == "INVALID_CREDENTIALS"

    def test_outdated_hash_is_upgraded_transparently(
        self, browser: TestClient, settings: Settings, db_session: Session
    ) -> None:
        weak = PasswordHash((Argon2Hasher(time_cost=1, memory_cost=8192, parallelism=1),))
        user = UserRepository(db_session).get_by_email(EMAIL)
        assert user is not None
        user.password_hash = weak.hash(VALID_PASSWORD)
        db_session.flush()
        outdated = user.password_hash

        assert login(browser, settings).status_code == HTTPStatus.OK

        db_session.refresh(user)
        assert user.password_hash != outdated
        assert "m=65536,t=3,p=4" in user.password_hash

    def test_security_log_never_contains_the_password_or_tokens(
        self, browser: TestClient, settings: Settings, caplog: pytest.LogCaptureFixture
    ) -> None:
        with caplog.at_level("INFO", logger="app.security"):
            login(browser, settings, password="Contraseña-Equivocada-1")
            login(browser, settings)

        events = [record for record in caplog.records if record.name == "app.security"]
        logged = " ".join(str(vars(record)) for record in events)
        assert {getattr(record, "security_event", None) for record in events} == {
            "login_failed",
            "login_succeeded",
        }
        assert "Contraseña-Equivocada-1" not in logged
        assert VALID_PASSWORD not in logged
        assert EMAIL not in logged
        secrets = (
            settings.access_cookie_name,
            settings.refresh_cookie_name,
            settings.csrf_cookie_name,
        )
        for cookie in browser.cookies.jar:
            if cookie.name in secrets:
                assert cookie.value is not None
                assert cookie.value not in logged
