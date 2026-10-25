"""Ayudantes para las pruebas de la API de autenticación."""

from typing import Any

from fastapi.testclient import TestClient
from httpx import Response

from app.core.config import Settings
from app.core.constants import CSRF_HEADER

AUTH = "/api/v1/auth"
VALID_PASSWORD = "Cuaderno-Azul-2026"
OTHER_VALID_PASSWORD = "Lampara-Verde-2027"


def csrf_headers(client: TestClient, settings: Settings) -> dict[str, str]:
    """Encabezado CSRF con el valor de la cookie (la pide si el navegador aún no la tiene)."""
    token = client.cookies.get(settings.csrf_cookie_name)
    if token is None:
        token = client.get(f"{AUTH}/csrf").json()["csrf_token"]
    return {CSRF_HEADER: token}


def registration(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "email": "ana.garcia@tesh.edu.mx",
        "password": VALID_PASSWORD,
        "first_names": "Ana María",
        "paternal_surname": "García",
        "maternal_surname": "López",
        "employee_number": "TESH-0042",
    }
    return data | overrides


def register(client: TestClient, settings: Settings, **overrides: Any) -> Response:
    response: Response = client.post(
        f"{AUTH}/register",
        json=registration(**overrides),
        headers=csrf_headers(client, settings),
    )
    return response


def login(
    client: TestClient,
    settings: Settings,
    email: str = "ana.garcia@tesh.edu.mx",
    password: str = VALID_PASSWORD,
) -> Response:
    response: Response = client.post(
        f"{AUTH}/login",
        json={"email": email, "password": password},
        headers=csrf_headers(client, settings),
    )
    return response


def post(client: TestClient, settings: Settings, path: str, **kwargs: Any) -> Response:
    response: Response = client.post(
        f"{AUTH}{path}", headers=csrf_headers(client, settings), **kwargs
    )
    return response


def error_code(response: Response) -> str:
    code: str = response.json()["error"]["code"]
    return code
