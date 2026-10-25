"""Respuestas de error reutilizables para la documentación OpenAPI."""

from http import HTTPStatus
from typing import Any

from app.core.codes import ErrorCode
from app.core.exceptions import ERROR_CATALOG
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


_STATUS_DESCRIPTIONS: dict[int, str] = {
    HTTPStatus.UNAUTHORIZED: "Sin sesión válida.",
    HTTPStatus.FORBIDDEN: "Sin perfil de docente, o falta el token CSRF en una escritura.",
    HTTPStatus.NOT_FOUND: "No existe o pertenece a otro docente (RN-04).",
    HTTPStatus.CONFLICT: "Choca con datos existentes o con un periodo emitido.",
    HTTPStatus.UNPROCESSABLE_ENTITY: "Datos inválidos o regla de negocio incumplida.",
}


def business_responses(*codes: ErrorCode, writes: bool = False) -> dict[int | str, dict[str, Any]]:
    """Bloque ``responses`` de una ruta de negocio: agrupa los códigos posibles por estado
    HTTP (según ``ERROR_CATALOG``) y usa el primero de cada estado como ejemplo.

    Toda ruta de negocio puede responder 401, 403 y 422 de validación; las escrituras
    también 403 por CSRF.
    """
    common = [ErrorCode.NOT_AUTHENTICATED, ErrorCode.TEACHER_PROFILE_REQUIRED]
    if writes:
        common.append(ErrorCode.CSRF_TOKEN_INVALID)
    by_status: dict[int, list[ErrorCode]] = {}
    for code in [*common, *codes, ErrorCode.VALIDATION_ERROR]:
        by_status.setdefault(ERROR_CATALOG[code].status, []).append(code)
    responses: dict[int | str, dict[str, Any]] = {}
    for status, status_codes in sorted(by_status.items()):
        example = status_codes[0]
        listed = ", ".join(f"`{code.value}`" for code in status_codes)
        responses[status] = {
            "model": ErrorResponse,
            "description": f"{_STATUS_DESCRIPTIONS.get(status, '')} Códigos: {listed}.".strip(),
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": example.value,
                            "message": ERROR_CATALOG[example].message,
                            "details": {},
                        }
                    }
                }
            },
        }
    return responses
