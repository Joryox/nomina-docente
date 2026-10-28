"""Ayudantes para las pruebas de la API de negocio.

El calendario del negocio se fija en ``TODAY`` (miércoles 21 de octubre de 2026, 18:00 en
America/Mexico_City): la quincena en curso es la 2.ª de octubre y la 1.ª ya terminó.
"""

from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from httpx import Response

from app.core.config import Settings
from app.core.constants import API_V1_PREFIX, TIMEZONE
from tests.auth import csrf_headers, register

BUSINESS_NOW = datetime(2026, 10, 21, 18, 0, tzinfo=ZoneInfo(TIMEZONE))
TODAY = BUSINESS_NOW.date()
MONDAY = date(2026, 10, 19)
TUESDAY = date(2026, 10, 20)
LAST_MONDAY_OF_Q1 = date(2026, 10, 12)


class Api:
    """Navegador de un docente: agrega el prefijo ``/api/v1`` y el token CSRF."""

    def __init__(self, client: TestClient, settings: Settings) -> None:
        self.client = client
        self._settings = settings

    def get(self, path: str, **params: Any) -> Response:
        response: Response = self.client.get(f"{API_V1_PREFIX}{path}", params=params or None)
        return response

    def post(self, path: str, json: Any = None) -> Response:
        response: Response = self.client.post(
            f"{API_V1_PREFIX}{path}", json=json, headers=self._csrf()
        )
        return response

    def patch(self, path: str, json: Any) -> Response:
        response: Response = self.client.patch(
            f"{API_V1_PREFIX}{path}", json=json, headers=self._csrf()
        )
        return response

    def delete(self, path: str) -> Response:
        response: Response = self.client.delete(f"{API_V1_PREFIX}{path}", headers=self._csrf())
        return response

    def _csrf(self) -> dict[str, str]:
        return csrf_headers(self.client, self._settings)


def register_teacher(client: TestClient, settings: Settings, number: int) -> Api:
    response = register(
        client,
        settings,
        email=f"docente{number}@tesh.edu.mx",
        employee_number=f"TESH-{number:04d}",
    )
    assert response.status_code == 201, response.text
    return Api(client, settings)


def ok(response: Response, status: int = 200) -> Any:
    assert response.status_code == status, response.text
    return response.json()


def error(response: Response, status: int, code: str) -> dict[str, Any]:
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()["error"]
    assert body["code"] == code, body
    return body


def create_subject(api: Api, name: str = "Bases de Datos") -> dict[str, Any]:
    result: dict[str, Any] = ok(api.post("/subjects", {"name": name}), 201)
    return result


def create_assignment(
    api: Api,
    subject: str = "Bases de Datos",
    career: str = "ISC",
    rate: str = "125.00",
) -> dict[str, Any]:
    subject_id = create_subject(api, subject)["id"]
    result: dict[str, Any] = ok(
        api.post(
            "/assignments",
            {"subject_id": subject_id, "career_code": career, "hourly_rate": rate},
        ),
        201,
    )
    return result


def add_schedule(
    api: Api, assignment_id: str, weekday: int, start: str, end: str
) -> dict[str, Any]:
    result: dict[str, Any] = ok(
        api.post(
            f"/assignments/{assignment_id}/schedules",
            {"weekday": weekday, "start_time": start, "end_time": end},
        ),
        201,
    )
    return result


def log_session(
    api: Api, assignment_id: str, day: date, start: str, end: str, **extra: Any
) -> Response:
    return api.post(
        "/logbook",
        {
            "assignment_id": assignment_id,
            "session_date": day.isoformat(),
            "start_time": start,
            "end_time": end,
            **extra,
        },
    )


def logged(api: Api, assignment_id: str, day: date, start: str, end: str) -> dict[str, Any]:
    result: dict[str, Any] = ok(log_session(api, assignment_id, day, start, end), 201)
    return result
