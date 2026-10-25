from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.constants import API_V1_PREFIX

MODIFYING_METHODS = {"post", "put", "patch", "delete"}


@pytest.fixture
def operations(client: TestClient) -> list[tuple[str, str, dict[str, Any]]]:
    schema = client.get(f"{API_V1_PREFIX}/openapi.json").json()
    return [
        (path, method, operation)
        for path, methods in schema["paths"].items()
        for method, operation in methods.items()
    ]


def test_every_operation_is_documented_in_spanish(
    operations: list[tuple[str, str, dict[str, Any]]],
) -> None:
    undocumented = [
        f"{method.upper()} {path}"
        for path, method, operation in operations
        if not (operation.get("tags") and operation.get("summary"))
    ]

    assert undocumented == []


def test_auth_operations_describe_their_behavior(
    operations: list[tuple[str, str, dict[str, Any]]],
) -> None:
    auth = [(path, op) for path, _, op in operations if "/auth/" in path]

    assert auth
    assert all(op.get("description") for _, op in auth)


def test_modifying_operations_document_the_csrf_error(
    operations: list[tuple[str, str, dict[str, Any]]],
) -> None:
    missing = [
        f"{method.upper()} {path}"
        for path, method, operation in operations
        if method in MODIFYING_METHODS and "403" not in operation["responses"]
    ]

    assert missing == []


def test_request_examples_are_published(client: TestClient) -> None:
    schemas = client.get(f"{API_V1_PREFIX}/openapi.json").json()["components"]["schemas"]

    assert schemas["RegisterRequest"]["examples"]
    assert schemas["ErrorResponse"]
