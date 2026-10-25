"""Contratos de las materias del docente (RN-08, RN-09)."""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Self

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.core.constants import (
    SUBJECT_CODE_MAX_LENGTH,
    SUBJECT_CODE_PATTERN,
    SUBJECT_NAME_MAX_LENGTH,
)
from app.schemas.common import Page, StrictInput
from app.utils.text import collapse_spaces


def _collapse(value: Any) -> Any:
    return collapse_spaces(value) if isinstance(value, str) else value


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip() or None
    return value


SubjectName = Annotated[
    str,
    BeforeValidator(_collapse),
    StringConstraints(min_length=1, max_length=SUBJECT_NAME_MAX_LENGTH),
]
_CodeText = Annotated[
    str, StringConstraints(max_length=SUBJECT_CODE_MAX_LENGTH, pattern=SUBJECT_CODE_PATTERN)
]
SubjectCode = Annotated[_CodeText | None, BeforeValidator(_blank_to_none)]


class SubjectCreate(StrictInput):
    name: SubjectName = Field(description="Se guarda con espacios simples y mayúsculas coherentes")
    code: SubjectCode = Field(
        default=None, description="Clave opcional (letras, números y guiones)"
    )

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"name": "bases de datos", "code": "SCD-1004"}]},
    )


class SubjectUpdate(StrictInput):
    """Solo cambia los campos enviados; ``code: null`` borra la clave."""

    name: SubjectName | None = None
    code: SubjectCode = None

    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"name": "Bases de Datos II"}]}
    )

    @model_validator(mode="after")
    def _require_changes(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Envía al menos un dato para actualizar.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("El nombre de la materia no puede quedar vacío.")
        return self


class SubjectResponse(BaseModel):
    id: uuid.UUID
    name: str = Field(examples=["Bases de Datos"])
    code: str | None = Field(examples=["SCD-1004"])
    is_active: bool
    active_assignment_count: int = Field(ge=0)
    assignment_count: int = Field(ge=0, description="Incluye asignaciones desactivadas")
    created_at: datetime
    updated_at: datetime


class SubjectPage(Page[SubjectResponse]):
    pass


class SubjectRemovalOutcome(StrEnum):
    DELETED = "deleted"
    DEACTIVATED = "deactivated"


class SubjectRemovalResponse(BaseModel):
    outcome: SubjectRemovalOutcome = Field(
        description="deleted: no tenía asignaciones y se borró. deactivated: tiene historial "
        "y solo se desactivó."
    )
    subject: SubjectResponse | None = Field(description="La materia desactivada, si aplica")
