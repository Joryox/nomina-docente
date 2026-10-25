import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.core.exceptions import (
    BusinessRuleError,
    ConflictError,
    DomainError,
    NotFoundError,
    register_exception_handlers,
)


class Payload(BaseModel):
    hours: int


def build_client(error: Exception) -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def boom() -> None:
        raise error

    @app.post("/payload")
    def payload(body: Payload) -> Payload:
        return body

    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (NotFoundError(), 404, "NOT_FOUND"),
        (ConflictError(code="SCHEDULE_OVERLAP"), 409, "SCHEDULE_OVERLAP"),
        (BusinessRuleError(), 422, "BUSINESS_RULE_VIOLATION"),
        (DomainError(), 400, "BAD_REQUEST"),
    ],
)
def test_domain_errors_map_to_status_and_code(error: DomainError, status: int, code: str) -> None:
    response = build_client(error).get("/boom")

    assert response.status_code == status
    assert response.json()["error"]["code"] == code


def test_domain_error_keeps_message_and_details() -> None:
    error = ConflictError("El horario se empalma.", details={"weekday": 1})

    body = build_client(error).get("/boom").json()

    assert body == {
        "error": {
            "code": "CONFLICT",
            "message": "El horario se empalma.",
            "details": {"weekday": 1},
        }
    }


def test_validation_errors_list_fields() -> None:
    response = build_client(NotFoundError()).post("/payload", json={"hours": "muchas"})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"]["fields"][0]["location"] == ["body", "hours"]


def test_unknown_route_uses_error_format() -> None:
    response = build_client(NotFoundError()).get("/no-existe")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_unexpected_errors_hide_internal_details() -> None:
    response = build_client(RuntimeError("secreto interno")).get("/boom")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "secreto interno" not in response.text
