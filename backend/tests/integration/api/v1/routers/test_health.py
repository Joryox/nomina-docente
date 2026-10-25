import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_health_service
from app.core.config import Settings
from app.core.constants import REQUEST_ID_HEADER
from app.schemas.health import DatabaseStatus, HealthResponse, ServiceStatus
from app.services.health import HealthService

HEALTH_URL = "/api/v1/health"


class DegradedHealthService(HealthService):
    def __init__(self) -> None:
        pass

    def check(self) -> HealthResponse:
        return HealthResponse(
            status=ServiceStatus.DEGRADED,
            database=DatabaseStatus.UNAVAILABLE,
            version="0.0.0",
            environment="test",
        )


def test_health_reports_degraded_database_without_failing(app: FastAPI) -> None:
    app.dependency_overrides[get_health_service] = DegradedHealthService
    with TestClient(app) as client:
        response = client.get(HEALTH_URL)

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
    assert response.json()["database"] == "unavailable"


def test_health_returns_request_id_header(app: FastAPI) -> None:
    app.dependency_overrides[get_health_service] = DegradedHealthService
    with TestClient(app) as client:
        response = client.get(HEALTH_URL, headers={REQUEST_ID_HEADER: "prueba-123"})

    assert response.headers[REQUEST_ID_HEADER] == "prueba-123"


def test_health_rejects_unsupported_method_with_error_format(client: TestClient) -> None:
    response = client.post(HEALTH_URL)

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


@pytest.mark.db
def test_health_reports_ok_with_real_database(db_client: TestClient, settings: Settings) -> None:
    response = db_client.get(HEALTH_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["environment"] == settings.app_env
