"""Respuestas de error reutilizables para la documentación OpenAPI."""

from http import HTTPStatus
from typing import Any

from app.schemas.error import ErrorResponse

_ERROR_DESCRIPTIONS: dict[int, tuple[str, str, str]] = {
    HTTPStatus.BAD_REQUEST: (
        "Solicitud incorrecta.",
        "CURRENT_PASSWORD_INCORRECT",
        "La contraseña actual no es correcta.",
    ),
    HTTPStatus.UNAUTHORIZED: (
        "Sin sesión válida, token expirado o credenciales incorrectas.",
        "NOT_AUTHENTICATED",
        "Inicia sesión para continuar.",
    ),
    HTTPStatus.FORBIDDEN: (
        "Falta el token CSRF, el origen no está permitido o no hay permiso.",
        "CSRF_TOKEN_INVALID",
        "La sesión de seguridad del formulario expiró. Recarga la página e intenta de nuevo.",
    ),
    HTTPStatus.CONFLICT: (
        "El dato ya existe o la sesión se renovó en otra pestaña.",
        "EMAIL_ALREADY_REGISTERED",
        "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.",
    ),
    HTTPStatus.REQUEST_ENTITY_TOO_LARGE: (
        "El cuerpo de la solicitud supera el tamaño permitido.",
        "PAYLOAD_TOO_LARGE",
        "La solicitud es demasiado grande.",
    ),
    HTTPStatus.UNPROCESSABLE_ENTITY: (
        "Datos inválidos o contraseña que no cumple la política.",
        "PASSWORD_POLICY_VIOLATION",
        "La contraseña no cumple los requisitos de seguridad.",
    ),
}


def error_responses(*statuses: int) -> dict[int | str, dict[str, Any]]:
    """Bloque ``responses`` de FastAPI con el formato único de error y un ejemplo."""
    responses: dict[int | str, dict[str, Any]] = {}
    for status in statuses:
        description, code, message = _ERROR_DESCRIPTIONS[status]
        responses[status] = {
            "model": ErrorResponse,
            "description": description,
            "content": {
                "application/json": {
                    "example": {"error": {"code": code, "message": message, "details": {}}}
                }
            },
        }
    return responses
