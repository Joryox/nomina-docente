"""Tokens de acceso, rotación del refresh token, detección de reuso y cierre de sesión."""

from collections.abc import Callable
from datetime import timedelta
from http import HTTPStatus

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.constants import REFRESH_COOKIE_PATH
from app.models import AuthSession, RefreshToken
from tests.auth import AUTH, error_code, login, post, register
from tests.helpers import FakeClock

pytestmark = pytest.mark.db

ME = f"{AUTH}/me"
COOKIE_DOMAIN = "testserver.local"


def _refresh_cookie(client: TestClient, settings: Settings) -> str:
    value: str | None = client.cookies.get(settings.refresh_cookie_name)
    assert value is not None
    return value


def _stolen_browser(
    make_client: Callable[[], TestClient], settings: Settings, refresh_token: str
) -> TestClient:
    """Navegador del atacante: solo tiene una copia del refresh token."""
    attacker = make_client()
    attacker.cookies.set(
        settings.refresh_cookie_name, refresh_token, domain=COOKIE_DOMAIN, path=REFRESH_COOKIE_PATH
    )
    return attacker


@pytest.fixture
def victim(make_client: Callable[[], TestClient], settings: Settings) -> TestClient:
    client = make_client()
    assert register(client, settings).status_code == HTTPStatus.CREATED
    return client


class TestAccessToken:
    def test_me_without_session_is_rejected(self, browser: TestClient) -> None:
        response = browser.get(ME)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert error_code(response) == "NOT_AUTHENTICATED"

    def test_expired_access_token_is_rejected(
        self, browser: TestClient, settings: Settings, clock: FakeClock
    ) -> None:
        # El token se emite «hace» más tiempo que su vida útil; PyJWT valida con la hora real.
        clock.advance(-timedelta(minutes=settings.access_token_expire_minutes + 1))
        register(browser, settings)

        response = browser.get(ME)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert error_code(response) == "ACCESS_TOKEN_EXPIRED"

    def test_tampered_access_token_is_rejected(
        self, victim: TestClient, settings: Settings
    ) -> None:
        token = victim.cookies.get(settings.access_cookie_name)
        assert token is not None
        victim.cookies.set(settings.access_cookie_name, token[:-2] + "xx", domain=COOKIE_DOMAIN)

        response = victim.get(ME)

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert error_code(response) == "SESSION_INVALID"


class TestRefresh:
    def test_refresh_rotates_the_token(
        self, victim: TestClient, settings: Settings, db_session: Session
    ) -> None:
        old = _refresh_cookie(victim, settings)

        response = post(victim, settings, "/refresh")

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert _refresh_cookie(victim, settings) != old
        assert victim.get(ME).status_code == HTTPStatus.OK
        tokens = db_session.scalars(select(RefreshToken)).all()
        assert len(tokens) == 2
        assert sum(token.used_at is None for token in tokens) == 1

    def test_refresh_renews_an_expired_access_token(
        self, browser: TestClient, settings: Settings, clock: FakeClock
    ) -> None:
        clock.advance(-timedelta(minutes=settings.access_token_expire_minutes + 1))
        register(browser, settings)
        clock.advance(timedelta(minutes=settings.access_token_expire_minutes + 1))

        assert post(browser, settings, "/refresh").status_code == HTTPStatus.NO_CONTENT
        assert browser.get(ME).status_code == HTTPStatus.OK

    def test_reusing_a_rotated_token_revokes_every_session(
        self,
        victim: TestClient,
        make_client: Callable[[], TestClient],
        settings: Settings,
        clock: FakeClock,
        db_session: Session,
    ) -> None:
        other_device = make_client()
        login(other_device, settings)
        stolen = _refresh_cookie(victim, settings)
        post(victim, settings, "/refresh")
        clock.advance(timedelta(seconds=settings.refresh_token_reuse_grace_seconds + 1))

        attacker = _stolen_browser(make_client, settings, stolen)
        response = post(attacker, settings, "/refresh")

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert error_code(response) == "SESSION_INVALID"
        assert victim.get(ME).status_code == HTTPStatus.UNAUTHORIZED
        assert other_device.get(ME).status_code == HTTPStatus.UNAUTHORIZED
        reasons = set(db_session.scalars(select(AuthSession.revocation_reason)))
        assert reasons == {"refresh_token_reused"}

    def test_reuse_within_the_grace_period_is_a_conflict_not_a_theft(
        self, victim: TestClient, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        """Dos pestañas renuevan casi a la vez: la segunda recibe 409 y nada se revoca."""
        stolen = _refresh_cookie(victim, settings)
        post(victim, settings, "/refresh")

        second_tab = _stolen_browser(make_client, settings, stolen)
        response = post(second_tab, settings, "/refresh")

        assert response.status_code == HTTPStatus.CONFLICT
        assert error_code(response) == "SESSION_REFRESH_CONFLICT"
        assert victim.get(ME).status_code == HTTPStatus.OK

    def test_unknown_refresh_token_clears_the_session_cookies(
        self, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        client = _stolen_browser(make_client, settings, "token-que-no-existe")

        response = post(client, settings, "/refresh")

        assert response.status_code == HTTPStatus.UNAUTHORIZED
        assert settings.refresh_cookie_name not in client.cookies

    def test_refresh_token_expires(
        self, victim: TestClient, settings: Settings, clock: FakeClock
    ) -> None:
        clock.advance(timedelta(days=settings.refresh_token_expire_days, seconds=1))

        response = post(victim, settings, "/refresh")

        assert response.status_code == HTTPStatus.UNAUTHORIZED

    def test_refresh_cookie_only_travels_to_auth_routes(
        self, victim: TestClient, settings: Settings
    ) -> None:
        cookie = next(c for c in victim.cookies.jar if c.name == settings.refresh_cookie_name)

        assert cookie.path == REFRESH_COOKIE_PATH


class TestLogout:
    def test_logout_revokes_the_current_session_only(
        self, victim: TestClient, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        other_device = make_client()
        login(other_device, settings)
        access = victim.cookies.get(settings.access_cookie_name)

        response = post(victim, settings, "/logout")

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert settings.access_cookie_name not in victim.cookies
        assert other_device.get(ME).status_code == HTTPStatus.OK
        # El token de acceso deja de servir de inmediato, aunque no haya expirado.
        assert access is not None
        replay = make_client()
        replay.cookies.set(settings.access_cookie_name, access, domain=COOKIE_DOMAIN)
        assert replay.get(ME).status_code == HTTPStatus.UNAUTHORIZED

    def test_logout_without_session_is_idempotent(
        self, browser: TestClient, settings: Settings
    ) -> None:
        assert post(browser, settings, "/logout").status_code == HTTPStatus.NO_CONTENT

    def test_logout_all_revokes_every_session(
        self, victim: TestClient, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        other_device = make_client()
        login(other_device, settings)

        response = post(victim, settings, "/logout-all")

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert victim.get(ME).status_code == HTTPStatus.UNAUTHORIZED
        assert other_device.get(ME).status_code == HTTPStatus.UNAUTHORIZED
        assert post(other_device, settings, "/refresh").status_code == HTTPStatus.UNAUTHORIZED

    def test_logout_all_requires_a_session(self, browser: TestClient, settings: Settings) -> None:
        assert post(browser, settings, "/logout-all").status_code == HTTPStatus.UNAUTHORIZED
