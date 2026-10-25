"""Endurecimiento HTTP: CSRF, cabeceras de seguridad, tamaño de petición y errores."""

from collections.abc import Callable
from http import HTTPStatus
from typing import Annotated

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import CurrentTeacher, require_roles
from app.core.config import Settings
from app.core.constants import CSRF_HEADER, RoleCode
from app.services.sessions import Principal
from tests.auth import AUTH, csrf_headers, error_code, register, registration

pytestmark = pytest.mark.db

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cache-Control": "no-store",
}


class TestCsrf:
    @pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
    def test_modifying_requests_without_token_are_rejected(
        self, browser: TestClient, method: str
    ) -> None:
        response = browser.request(method.upper(), f"{AUTH}/me")

        assert response.status_code == HTTPStatus.FORBIDDEN
        assert error_code(response) == "CSRF_TOKEN_INVALID"

    def test_login_and_register_are_protected_too(self, browser: TestClient) -> None:
        """Sin token no se puede forzar a la víctima a entrar en una cuenta ajena."""
        assert browser.post(f"{AUTH}/register", json=registration()).status_code == 403
        login = browser.post(f"{AUTH}/login", json={"email": "a@b.mx", "password": "x"})
        assert error_code(login) == "CSRF_TOKEN_INVALID"

    def test_header_must_match_the_cookie(self, browser: TestClient, settings: Settings) -> None:
        csrf_headers(browser, settings)

        response = browser.post(
            f"{AUTH}/register", json=registration(), headers={CSRF_HEADER: "otro-valor"}
        )

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_foreign_origin_is_rejected_even_with_a_valid_token(
        self, browser: TestClient, settings: Settings
    ) -> None:
        headers = csrf_headers(browser, settings) | {"Origin": "https://sitio-malicioso.example"}

        response = browser.post(f"{AUTH}/register", json=registration(), headers=headers)

        assert response.status_code == HTTPStatus.FORBIDDEN
        assert error_code(response) == "CSRF_ORIGIN_NOT_ALLOWED"

    def test_allowed_origin_is_accepted(self, browser: TestClient, settings: Settings) -> None:
        headers = csrf_headers(browser, settings) | {"Origin": settings.cors_origins[0]}

        response = browser.post(f"{AUTH}/register", json=registration(), headers=headers)

        assert response.status_code == HTTPStatus.CREATED

    def test_csrf_endpoint_reuses_the_existing_cookie(self, browser: TestClient) -> None:
        first = browser.get(f"{AUTH}/csrf").json()["csrf_token"]

        assert browser.get(f"{AUTH}/csrf").json()["csrf_token"] == first

    def test_login_rotates_the_csrf_token(self, browser: TestClient, settings: Settings) -> None:
        before = csrf_headers(browser, settings)[CSRF_HEADER]
        register(browser, settings)

        assert browser.cookies.get(settings.csrf_cookie_name) != before


class TestHardening:
    @pytest.mark.parametrize("path", [f"{AUTH}/me", "/api/v1/health", "/api/v1/no-existe"])
    def test_security_headers_are_present(self, browser: TestClient, path: str) -> None:
        response = browser.get(path)

        for name, value in SECURITY_HEADERS.items():
            assert response.headers[name] == value
        assert "default-src 'none'" in response.headers["Content-Security-Policy"]
        assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
        assert "camera=()" in response.headers["Permissions-Policy"]

    def test_hsts_is_only_sent_in_production(self, browser: TestClient) -> None:
        assert "Strict-Transport-Security" not in browser.get("/api/v1/health").headers

    def test_oversized_body_is_rejected(self, browser: TestClient, settings: Settings) -> None:
        payload = registration(first_names="A" * (settings.max_request_body_bytes + 1))

        response = browser.post(
            f"{AUTH}/register", json=payload, headers=csrf_headers(browser, settings)
        )

        assert response.status_code == HTTPStatus.REQUEST_ENTITY_TOO_LARGE
        assert error_code(response) == "PAYLOAD_TOO_LARGE"

    def test_invalid_json_uses_the_error_format(
        self, browser: TestClient, settings: Settings
    ) -> None:
        response = browser.post(
            f"{AUTH}/login",
            content=b"{no es json",
            headers=csrf_headers(browser, settings) | {"Content-Type": "application/json"},
        )

        assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
        assert response.json()["error"]["message"] == "Los datos enviados no son válidos."

    def test_not_found_is_answered_in_spanish(self, browser: TestClient) -> None:
        body = browser.get("/api/v1/no-existe").json()

        assert body == {
            "error": {
                "code": "NOT_FOUND",
                "message": "El recurso solicitado no existe.",
                "details": {},
            }
        }

    def test_password_policy_is_public(self, browser: TestClient, settings: Settings) -> None:
        body = browser.get(f"{AUTH}/password-policy").json()

        assert body["min_length"] == settings.password_min_length
        assert "not_common" in body["rules"]


class TestAuthorizationDependencies:
    @pytest.fixture
    def guarded_app(self, auth_app: FastAPI) -> FastAPI:
        """Rutas de ejemplo con las dependencias que usarán las rutas de negocio."""

        @auth_app.get("/api/v1/_prueba/docente")
        def teacher_only(teacher: CurrentTeacher) -> dict[str, str]:
            return {"first_names": teacher.first_names}

        @auth_app.get("/api/v1/_prueba/admin")
        def admin_only(
            principal: Annotated[Principal, Depends(require_roles(RoleCode.ADMIN))],
        ) -> dict[str, str]:
            return {"email": principal.user.email}

        return auth_app

    @pytest.fixture
    def teacher(
        self, guarded_app: FastAPI, make_client: Callable[[], TestClient], settings: Settings
    ) -> TestClient:
        client = make_client()
        register(client, settings)
        return client

    def test_current_teacher_resolves_the_own_profile(self, teacher: TestClient) -> None:
        assert teacher.get("/api/v1/_prueba/docente").json() == {"first_names": "Ana María"}

    def test_require_roles_rejects_a_missing_role(self, teacher: TestClient) -> None:
        response = teacher.get("/api/v1/_prueba/admin")

        assert response.status_code == HTTPStatus.FORBIDDEN
        assert error_code(response) == "PERMISSION_DENIED"

    def test_guarded_routes_require_a_session(
        self, guarded_app: FastAPI, browser: TestClient
    ) -> None:
        assert browser.get("/api/v1/_prueba/docente").status_code == HTTPStatus.UNAUTHORIZED
