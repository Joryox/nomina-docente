"""Excepciones de dominio y su traducción central a respuestas HTTP.

Los servicios lanzan excepciones de dominio sin saber de HTTP. Los manejadores de este
módulo las convierten siempre al mismo formato:

    { "error": { "code": "…", "message": "…", "details": {} } }
"""

import logging
from collections.abc import Mapping
from enum import StrEnum
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.error import ErrorBody, ErrorResponse

logger = logging.getLogger(__name__)


class ErrorCode(StrEnum):
    BAD_REQUEST = "BAD_REQUEST"
    NOT_FOUND = "NOT_FOUND"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    CONFLICT = "CONFLICT"
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    # Autenticación y autorización
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    ACCESS_TOKEN_EXPIRED = "ACCESS_TOKEN_EXPIRED"
    SESSION_INVALID = "SESSION_INVALID"
    SESSION_REFRESH_CONFLICT = "SESSION_REFRESH_CONFLICT"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    CURRENT_PASSWORD_INCORRECT = "CURRENT_PASSWORD_INCORRECT"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    TEACHER_PROFILE_REQUIRED = "TEACHER_PROFILE_REQUIRED"
    CSRF_TOKEN_INVALID = "CSRF_TOKEN_INVALID"
    CSRF_ORIGIN_NOT_ALLOWED = "CSRF_ORIGIN_NOT_ALLOWED"
    # Registro y cuenta
    EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
    EMPLOYEE_NUMBER_ALREADY_REGISTERED = "EMPLOYEE_NUMBER_ALREADY_REGISTERED"
    PASSWORD_POLICY_VIOLATION = "PASSWORD_POLICY_VIOLATION"


class DomainError(Exception):
    """Base de todas las excepciones de dominio."""

    default_code: str = ErrorCode.BAD_REQUEST
    default_message: str = "La solicitud no es válida."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code or self.default_code
        self.message = message or self.default_message
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(DomainError):
    default_code = ErrorCode.NOT_FOUND
    default_message = "El recurso solicitado no existe."


class ConflictError(DomainError):
    default_code = ErrorCode.CONFLICT
    default_message = "La operación entra en conflicto con datos existentes."


class BusinessRuleError(DomainError):
    default_code = ErrorCode.BUSINESS_RULE_VIOLATION
    default_message = "La operación no cumple una regla de negocio."


class AuthenticationError(DomainError):
    """No hay sesión válida, o las credenciales no son correctas."""

    default_code = ErrorCode.NOT_AUTHENTICATED
    default_message = "Inicia sesión para continuar."


class PermissionDeniedError(DomainError):
    default_code = ErrorCode.PERMISSION_DENIED
    default_message = "No tienes permiso para realizar esta acción."


class PayloadTooLargeError(DomainError):
    default_code = ErrorCode.PAYLOAD_TOO_LARGE
    default_message = "La solicitud es demasiado grande."


_DOMAIN_ERROR_STATUS: dict[type[DomainError], HTTPStatus] = {
    NotFoundError: HTTPStatus.NOT_FOUND,
    ConflictError: HTTPStatus.CONFLICT,
    BusinessRuleError: HTTPStatus.UNPROCESSABLE_ENTITY,
    AuthenticationError: HTTPStatus.UNAUTHORIZED,
    PermissionDeniedError: HTTPStatus.FORBIDDEN,
    PayloadTooLargeError: HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
}

_HTTP_STATUS_CODE: dict[int, ErrorCode] = {
    HTTPStatus.NOT_FOUND: ErrorCode.NOT_FOUND,
    HTTPStatus.METHOD_NOT_ALLOWED: ErrorCode.METHOD_NOT_ALLOWED,
    HTTPStatus.UNAUTHORIZED: ErrorCode.NOT_AUTHENTICATED,
    HTTPStatus.FORBIDDEN: ErrorCode.PERMISSION_DENIED,
    HTTPStatus.REQUEST_ENTITY_TOO_LARGE: ErrorCode.PAYLOAD_TOO_LARGE,
}

# Mensajes en español de los errores de validación más comunes. Nunca se devuelve el valor
# recibido (``input``): podría ser una contraseña.
_VALIDATION_MESSAGES: dict[str, str] = {
    "missing": "Este campo es obligatorio.",
    "extra_forbidden": "Este campo no se admite.",
    "string_type": "Debe ser texto.",
    "string_too_short": "Debe tener al menos {min_length} caracteres.",
    "string_too_long": "Debe tener como máximo {max_length} caracteres.",
    "string_pattern_mismatch": "Tiene caracteres o un formato no permitidos.",
    "value_error": "{error}",
    "json_invalid": "El cuerpo de la solicitud no es JSON válido.",
    "model_attributes_type": "Debe ser un objeto JSON.",
    "dict_type": "Debe ser un objeto JSON.",
    "bool_type": "Debe ser verdadero o falso.",
    "int_type": "Debe ser un número entero.",
}
_DEFAULT_VALIDATION_MESSAGE = "El valor no es válido."

_HTTP_MESSAGES: dict[ErrorCode, str] = {
    ErrorCode.BAD_REQUEST: "La solicitud no es válida.",
    ErrorCode.NOT_FOUND: "El recurso solicitado no existe.",
    ErrorCode.METHOD_NOT_ALLOWED: "El método no está permitido en esta ruta.",
    ErrorCode.NOT_AUTHENTICATED: "Inicia sesión para continuar.",
    ErrorCode.PERMISSION_DENIED: "No tienes permiso para realizar esta acción.",
    ErrorCode.PAYLOAD_TOO_LARGE: "La solicitud es demasiado grande.",
}


def error_response(
    status: int, code: str, message: str, details: dict[str, Any] | None = None
) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details or {}))
    return JSONResponse(status_code=status, content=jsonable_encoder(body))


def _status_for(error: DomainError) -> HTTPStatus:
    for error_type in type(error).__mro__:
        if error_type in _DOMAIN_ERROR_STATUS:
            return _DOMAIN_ERROR_STATUS[error_type]
    return HTTPStatus.BAD_REQUEST


async def _handle_unexpected_error(_: Request, error: Exception) -> JSONResponse:
    logger.exception("Error no controlado", exc_info=error)
    return error_response(
        HTTPStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
    )


# Starlette tipa todos los manejadores con ``Exception``; cada uno estrecha el tipo y, si
# recibiera otro, responde como error inesperado en lugar de fallar.
async def _handle_domain_error(request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, DomainError):
        return await _handle_unexpected_error(request, error)
    return error_response(_status_for(error), error.code, error.message, error.details)


async def _handle_validation_error(request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, RequestValidationError):
        return await _handle_unexpected_error(request, error)
    fields = [
        {
            "location": [str(part) for part in issue["loc"]],
            "type": issue["type"],
            "message": _validation_message(issue),
        }
        for issue in error.errors()
    ]
    return error_response(
        HTTPStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION_ERROR,
        "Los datos enviados no son válidos.",
        {"fields": fields},
    )


def _validation_message(issue: Mapping[str, Any]) -> str:
    template = _VALIDATION_MESSAGES.get(str(issue["type"]), _DEFAULT_VALIDATION_MESSAGE)
    context = dict(issue.get("ctx") or {})
    # Los validadores propios lanzan ValueError con el mensaje ya en español.
    context.setdefault("error", _DEFAULT_VALIDATION_MESSAGE)
    try:
        return template.format(**{key: str(value) for key, value in context.items()})
    except (KeyError, IndexError):
        return _DEFAULT_VALIDATION_MESSAGE


async def _handle_http_exception(request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, StarletteHTTPException):
        return await _handle_unexpected_error(request, error)
    code = _HTTP_STATUS_CODE.get(error.status_code, ErrorCode.BAD_REQUEST)
    # El texto de Starlette está en inglés; se responde con el mensaje en español del código.
    return error_response(error.status_code, code, _HTTP_MESSAGES[code])


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _handle_domain_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)
