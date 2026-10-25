"""Formato único de las respuestas de error de la API."""

from typing import Any

from pydantic import BaseModel, Field

from app.core.codes import ErrorCode


class ErrorBody(BaseModel):
    code: ErrorCode = Field(description="Código estable en inglés, SCREAMING_SNAKE_CASE")
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorBody
