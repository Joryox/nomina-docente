"""Excepciones de dominio y su traducción central a respuestas HTTP.

Los servicios lanzan excepciones de dominio sin saber de HTTP. Los manejadores de este
módulo las convierten siempre al mismo formato:

    { "error": { "code": "…", "message": "…", "details": {} } }

``ErrorCode`` es el catálogo único de códigos estables. ``ERROR_CATALOG`` asigna a cada
código su estado HTTP y un mensaje por defecto en español; los servicios usan
``domain_error()`` para lanzar el error adecuado a partir del código. El catálogo completo
está publicado en ``docs/api.md`` y el frontend tiene un texto por código.
"""

import logging
from collections.abc import Mapping
from dataclasses import dataclass
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.codes import ErrorCode
from app.schemas.error import ErrorBody, ErrorResponse

logger = logging.getLogger(__name__)


class DomainError(Exception):
    """Base de todas las excepciones de dominio."""

    default_code: ErrorCode = ErrorCode.BAD_REQUEST
    default_message: str = "La solicitud no es válida."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: ErrorCode | None = None,
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


@dataclass(frozen=True)
class ErrorSpec:
    status: HTTPStatus
    message: str


_NOT_FOUND = HTTPStatus.NOT_FOUND
_CONFLICT = HTTPStatus.CONFLICT
_RULE = HTTPStatus.UNPROCESSABLE_ENTITY

ERROR_CATALOG: Mapping[ErrorCode, ErrorSpec] = {
    ErrorCode.BAD_REQUEST: ErrorSpec(HTTPStatus.BAD_REQUEST, "La solicitud no es válida."),
    ErrorCode.NOT_FOUND: ErrorSpec(_NOT_FOUND, "El recurso solicitado no existe."),
    ErrorCode.METHOD_NOT_ALLOWED: ErrorSpec(
        HTTPStatus.METHOD_NOT_ALLOWED, "El método no está permitido en esta ruta."
    ),
    ErrorCode.CONFLICT: ErrorSpec(
        _CONFLICT, "La operación entra en conflicto con datos existentes."
    ),
    ErrorCode.BUSINESS_RULE_VIOLATION: ErrorSpec(
        _RULE, "La operación no cumple una regla de negocio."
    ),
    ErrorCode.VALIDATION_ERROR: ErrorSpec(_RULE, "Los datos enviados no son válidos."),
    ErrorCode.PAYLOAD_TOO_LARGE: ErrorSpec(
        HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "La solicitud es demasiado grande."
    ),
    ErrorCode.INTERNAL_ERROR: ErrorSpec(
        HTTPStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado. Intenta de nuevo más tarde."
    ),
    ErrorCode.NOT_AUTHENTICATED: ErrorSpec(
        HTTPStatus.UNAUTHORIZED, "Inicia sesión para continuar."
    ),
    ErrorCode.ACCESS_TOKEN_EXPIRED: ErrorSpec(
        HTTPStatus.UNAUTHORIZED, "Tu sesión expiró. Vuelve a iniciar sesión."
    ),
    ErrorCode.SESSION_INVALID: ErrorSpec(
        HTTPStatus.UNAUTHORIZED, "Tu sesión ya no es válida. Vuelve a iniciar sesión."
    ),
    ErrorCode.SESSION_REFRESH_CONFLICT: ErrorSpec(
        _CONFLICT, "La sesión se acaba de renovar en otra pestaña."
    ),
    ErrorCode.INVALID_CREDENTIALS: ErrorSpec(
        HTTPStatus.UNAUTHORIZED, "Correo o contraseña incorrectos."
    ),
    ErrorCode.CURRENT_PASSWORD_INCORRECT: ErrorSpec(
        HTTPStatus.BAD_REQUEST, "La contraseña actual no es correcta."
    ),
    ErrorCode.PERMISSION_DENIED: ErrorSpec(
        HTTPStatus.FORBIDDEN, "No tienes permiso para realizar esta acción."
    ),
    ErrorCode.TEACHER_PROFILE_REQUIRED: ErrorSpec(
        HTTPStatus.FORBIDDEN, "Esta cuenta no tiene un perfil de docente."
    ),
    ErrorCode.CSRF_TOKEN_INVALID: ErrorSpec(
        HTTPStatus.FORBIDDEN,
        "La sesión de seguridad del formulario expiró. Recarga la página e intenta de nuevo.",
    ),
    ErrorCode.CSRF_ORIGIN_NOT_ALLOWED: ErrorSpec(
        HTTPStatus.FORBIDDEN, "La solicitud viene de un origen no permitido."
    ),
    ErrorCode.EMAIL_ALREADY_REGISTERED: ErrorSpec(
        _CONFLICT, "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo."
    ),
    ErrorCode.EMPLOYEE_NUMBER_ALREADY_REGISTERED: ErrorSpec(
        _CONFLICT, "Ese número de empleado ya está registrado en otra cuenta."
    ),
    ErrorCode.PASSWORD_POLICY_VIOLATION: ErrorSpec(
        _RULE, "La contraseña no cumple los requisitos de seguridad."
    ),
    ErrorCode.CAREER_NOT_FOUND: ErrorSpec(
        _NOT_FOUND, "La carrera no existe. Elige una carrera de la lista."
    ),
    ErrorCode.CAREER_INACTIVE: ErrorSpec(
        _RULE, "La carrera ya no está disponible. Elige otra carrera de la lista."
    ),
    ErrorCode.RATE_NOT_FOUND: ErrorSpec(
        _NOT_FOUND, "La tarifa no existe en el catálogo. Elige una tarifa de la lista."
    ),
    ErrorCode.RATE_INACTIVE: ErrorSpec(
        _RULE, "La tarifa ya no está vigente. Elige una tarifa vigente de la lista."
    ),
    ErrorCode.SUBJECT_NOT_FOUND: ErrorSpec(_NOT_FOUND, "La materia no existe."),
    ErrorCode.SUBJECT_ALREADY_EXISTS: ErrorSpec(
        _CONFLICT, "Ya registraste una materia con ese nombre. Usa la que ya existe."
    ),
    ErrorCode.SUBJECT_INACTIVE: ErrorSpec(
        _RULE, "La materia está desactivada. Reactívala antes de usarla."
    ),
    ErrorCode.SUBJECT_HAS_ACTIVE_ASSIGNMENTS: ErrorSpec(
        _CONFLICT,
        "La materia tiene asignaciones activas. Desactívalas o elimínalas antes de quitarla.",
    ),
    ErrorCode.ASSIGNMENT_NOT_FOUND: ErrorSpec(_NOT_FOUND, "La asignación no existe."),
    ErrorCode.ASSIGNMENT_ALREADY_EXISTS: ErrorSpec(
        _CONFLICT, "Ya tienes una asignación activa de esa materia en esa carrera."
    ),
    ErrorCode.ASSIGNMENT_INACTIVE: ErrorSpec(
        _RULE, "La asignación está desactivada. Reactívala antes de modificarla."
    ),
    ErrorCode.ASSIGNMENT_HAS_LOGBOOK: ErrorSpec(
        _CONFLICT,
        "La asignación tiene sesiones en la bitácora: no se puede borrar ni cambiar su materia "
        "o carrera. Desactívala y crea una nueva.",
    ),
    ErrorCode.SCHEDULE_NOT_FOUND: ErrorSpec(_NOT_FOUND, "El horario no existe."),
    ErrorCode.SCHEDULE_OVERLAP: ErrorSpec(
        _CONFLICT, "El horario se empalma con otra de tus clases. Elige otra hora."
    ),
    ErrorCode.TIME_RANGE_INVALID: ErrorSpec(
        _RULE, "La hora de salida debe ser posterior a la hora de entrada."
    ),
    ErrorCode.CLASS_TOO_SHORT: ErrorSpec(_RULE, "La clase dura menos de lo permitido."),
    ErrorCode.CLASS_TOO_LONG: ErrorSpec(_RULE, "La clase dura más de lo permitido."),
    ErrorCode.LOGBOOK_ENTRY_NOT_FOUND: ErrorSpec(_NOT_FOUND, "La sesión no existe en tu bitácora."),
    ErrorCode.SESSION_OVERLAP: ErrorSpec(
        _CONFLICT, "La sesión se empalma con otra sesión registrada ese día."
    ),
    ErrorCode.SESSION_DATE_IN_FUTURE: ErrorSpec(
        _RULE, "No se registran sesiones con fecha futura."
    ),
    ErrorCode.SESSION_NOT_FINISHED: ErrorSpec(
        _RULE, "La sesión todavía no termina. Regístrala después de la hora de salida."
    ),
    ErrorCode.SESSION_DATE_TOO_OLD: ErrorSpec(
        _RULE, "La sesión es demasiado antigua para registrarla o moverla a esa fecha."
    ),
    ErrorCode.ASSIGNMENT_INACTIVE_ON_DATE: ErrorSpec(
        _RULE, "La asignación no estaba activa en esa fecha."
    ),
    ErrorCode.SCHEDULE_NOT_ON_DATE: ErrorSpec(
        _RULE, "El horario elegido no corresponde al día de la semana de la fecha."
    ),
    ErrorCode.PERIOD_LOCKED: ErrorSpec(
        _CONFLICT, "La quincena ya tiene recibo emitido: su bitácora no se puede modificar."
    ),
    ErrorCode.PERIOD_IN_FUTURE: ErrorSpec(_RULE, "La quincena todavía no empieza."),
    ErrorCode.PERIOD_NOT_FINISHED: ErrorSpec(
        _RULE, "La quincena todavía no termina. Emite el recibo cuando concluya."
    ),
    ErrorCode.PERIOD_WITHOUT_SESSIONS: ErrorSpec(
        _RULE, "La quincena no tiene sesiones registradas: no hay nada que pagar."
    ),
    ErrorCode.RECEIPT_ALREADY_ISSUED: ErrorSpec(
        _CONFLICT, "Ya emitiste el recibo de esta quincena."
    ),
    ErrorCode.RECEIPT_NOT_FOUND: ErrorSpec(_NOT_FOUND, "El recibo no existe."),
}


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


_ERROR_TYPE_BY_STATUS: dict[HTTPStatus, type[DomainError]] = {
    status: error_type for error_type, status in _DOMAIN_ERROR_STATUS.items()
}


def domain_error(
    code: ErrorCode, message: str | None = None, details: dict[str, Any] | None = None
) -> DomainError:
    """Construye la excepción que corresponde al estado HTTP del código en el catálogo."""
    spec = ERROR_CATALOG[code]
    error_type = _ERROR_TYPE_BY_STATUS.get(spec.status, DomainError)
    return error_type(message or spec.message, code=code, details=details)


def error_response(
    status: int, code: ErrorCode, message: str, details: dict[str, Any] | None = None
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
