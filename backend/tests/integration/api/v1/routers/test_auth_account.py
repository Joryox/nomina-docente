from collections.abc import Callable
from http import HTTPStatus
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from app.core.config import Settings
from tests.auth import (
    AUTH,
    OTHER_VALID_PASSWORD,
    VALID_PASSWORD,
    csrf_headers,
    error_code,
    login,
    post,
    register,
)

pytestmark = pytest.mark.db

ME = f"{AUTH}/me"


@pytest.fixture
def teacher(make_client: Callable[[], TestClient], settings: Settings) -> TestClient:
    client = make_client()
    register(client, settings)
    return client


def _patch_me(client: TestClient, settings: Settings, data: dict[str, Any]) -> Response:
    response: Response = client.patch(ME, json=data, headers=csrf_headers(client, settings))
    return response


def _change_password(
    client: TestClient, settings: Settings, current: str, new: str = OTHER_VALID_PASSWORD
) -> Response:
    return post(
        client,
        settings,
        "/change-password",
        json={"current_password": current, "new_password": new},
    )


class TestProfile:
    def test_updates_only_the_fields_sent(self, teacher: TestClient, settings: Settings) -> None:
        response = _patch_me(teacher, settings, {"first_names": "  Ana  Lucía "})

        assert response.status_code == HTTPStatus.OK
        profile = response.json()["teacher"]
        assert profile["first_names"] == "Ana Lucía"
        assert profile["paternal_surname"] == "García"
        assert profile["employee_number"] == "TESH-0042"

    def test_null_clears_optional_fields(self, teacher: TestClient, settings: Settings) -> None:
        response = _patch_me(teacher, settings, {"employee_number": None, "maternal_surname": ""})

        profile = response.json()["teacher"]
        assert profile["employee_number"] is None
        assert profile["maternal_surname"] is None
        assert profile["full_name"] == "Ana María García"

    @pytest.mark.parametrize(
        "data",
        [{}, {"first_names": None}, {"email": "otro@tesh.edu.mx"}, {"first_names": "Ana<script>"}],
    )
    def test_invalid_updates_are_rejected(
        self, teacher: TestClient, settings: Settings, data: dict[str, Any]
    ) -> None:
        response = _patch_me(teacher, settings, data)

        assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
        assert error_code(response) == "VALIDATION_ERROR"

    def test_employee_number_of_another_teacher_is_rejected(
        self, teacher: TestClient, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        colleague = make_client()
        register(colleague, settings, email="luis@tesh.edu.mx", employee_number="TESH-0099")

        response = _patch_me(teacher, settings, {"employee_number": "TESH-0099"})

        assert response.status_code == HTTPStatus.CONFLICT
        assert error_code(response) == "EMPLOYEE_NUMBER_ALREADY_REGISTERED"

    def test_requires_a_session(self, browser: TestClient, settings: Settings) -> None:
        response = _patch_me(browser, settings, {"first_names": "Ana"})

        assert response.status_code == HTTPStatus.UNAUTHORIZED


class TestChangePassword:
    def test_requires_the_current_password(self, teacher: TestClient, settings: Settings) -> None:
        response = _change_password(teacher, settings, current="No-Es-La-Actual-1")

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert error_code(response) == "CURRENT_PASSWORD_INCORRECT"

    def test_applies_the_password_policy(self, teacher: TestClient, settings: Settings) -> None:
        response = _change_password(teacher, settings, current=VALID_PASSWORD, new="corta1")

        assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
        assert response.json()["error"]["details"]["rules"] == ["min_length"]

    def test_new_password_must_differ_from_the_current_one(
        self, teacher: TestClient, settings: Settings
    ) -> None:
        response = _change_password(teacher, settings, current=VALID_PASSWORD, new=VALID_PASSWORD)

        assert response.json()["error"]["details"]["rules"] == ["not_current"]

    def test_changes_the_password_and_revokes_the_other_sessions(
        self, teacher: TestClient, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        other_device = make_client()
        login(other_device, settings)

        response = _change_password(teacher, settings, current=VALID_PASSWORD)

        assert response.status_code == HTTPStatus.NO_CONTENT
        assert teacher.get(ME).status_code == HTTPStatus.OK
        assert other_device.get(ME).status_code == HTTPStatus.UNAUTHORIZED
        assert login(make_client(), settings).status_code == HTTPStatus.UNAUTHORIZED
        relogin = login(make_client(), settings, password=OTHER_VALID_PASSWORD)
        assert relogin.status_code == HTTPStatus.OK

    def test_wrong_current_password_counts_towards_the_lockout(
        self, teacher: TestClient, make_client: Callable[[], TestClient], settings: Settings
    ) -> None:
        for _ in range(settings.login_max_failed_attempts):
            _change_password(teacher, settings, current="No-Es-La-Actual-1")

        assert login(make_client(), settings).status_code == HTTPStatus.UNAUTHORIZED
