"""Excepciones de dominio y su traducción central a respuestas HTTP.

Los servicios lanzan excepciones de dominio sin saber de HTTP. Los manejadores de este
módulo las convierten siempre al mismo formato:

    { "error": { "code": "…", "message": "…", "details": {} } }
"""

import logging
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
    INTERNAL_ERROR = "INTERNAL_ERROR"


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


_DOMAIN_ERROR_STATUS: dict[type[DomainError], HTTPStatus] = {
    NotFoundError: HTTPStatus.NOT_FOUND,
    ConflictError: HTTPStatus.CONFLICT,
    BusinessRuleError: HTTPStatus.UNPROCESSABLE_ENTITY,
}

_HTTP_STATUS_CODE: dict[int, ErrorCode] = {
    HTTPStatus.NOT_FOUND: ErrorCode.NOT_FOUND,
    HTTPStatus.METHOD_NOT_ALLOWED: ErrorCode.METHOD_NOT_ALLOWED,
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
            "message": issue["msg"],
        }
        for issue in error.errors()
    ]
    return error_response(
        HTTPStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION_ERROR,
        "Los datos enviados no son válidos.",
        {"fields": fields},
    )


async def _handle_http_exception(request: Request, error: Exception) -> JSONResponse:
    if not isinstance(error, StarletteHTTPException):
        return await _handle_unexpected_error(request, error)
    code = _HTTP_STATUS_CODE.get(error.status_code, ErrorCode.BAD_REQUEST)
    return error_response(error.status_code, code, str(error.detail))


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _handle_domain_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)
