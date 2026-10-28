"""Contratos de las asignaciones: materia + carrera + tarifa (RN-13 a RN-15)."""

import uuid
from datetime import date, datetime
from typing import Annotated, Any, Self

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.core.constants import CATALOG_CODE_MAX_LENGTH, GROUP_CODE_MAX_LENGTH, GROUP_CODE_PATTERN
from app.schemas.catalogs import CareerResponse, HourlyRateResponse
from app.schemas.common import Hours, MoneyInput, Page, StrictInput
from app.schemas.schedules import ScheduleResponse

CareerCode = Annotated[
    str,
    StringConstraints(
        min_length=1, max_length=CATALOG_CODE_MAX_LENGTH, pattern=r"^[A-Z][A-Z0-9]*$"
    ),
]


def normalize_group(value: Any) -> Any:
    """RN-41: sin espacios en los extremos, en mayúsculas y con guion entre partes
    («3101 a» → «3101-A»). Vacío equivale a sin grupo."""
    if isinstance(value, str):
        return "-".join(value.split()).upper() or None
    return value


GroupCode = Annotated[
    Annotated[str, StringConstraints(max_length=GROUP_CODE_MAX_LENGTH, pattern=GROUP_CODE_PATTERN)]
    | None,
    BeforeValidator(normalize_group),
    Field(
        description="Grupo opcional (letras, números y guiones), por ejemplo «3101». Se "
        "guarda en mayúsculas; vacío o nulo es sin grupo",
        examples=["3101"],
    ),
]


class AssignmentCreate(StrictInput):
    subject_id: uuid.UUID = Field(description="Materia del docente (activa)")
    career_code: CareerCode = Field(description="Clave de una carrera activa del catálogo")
    hourly_rate: MoneyInput = Field(description="Importe de una tarifa vigente del catálogo")
    group: GroupCode = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "subject_id": "0b5c2f8e-1f7a-4d6e-9a43-6c1d2e3f4a5b",
                    "career_code": "ISC",
                    "hourly_rate": "135.00",
                    "group": "3101",
                }
            ]
        },
    )


class AssignmentUpdate(StrictInput):
    """Cambiar la tarifa siempre se permite y solo afecta a las sesiones que se registren
    después. Cambiar la materia o la carrera solo se permite si no hay bitácora. El grupo se
    cambia siempre (``null`` lo quita); los recibos emitidos conservan el que tenían."""

    subject_id: uuid.UUID | None = None
    career_code: CareerCode | None = None
    hourly_rate: MoneyInput | None = None
    group: GroupCode = None

    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"hourly_rate": "145.00"}]}
    )

    @model_validator(mode="after")
    def _require_changes(self) -> Self:
        # El grupo cuenta aunque sea nulo: enviarlo vacío significa quitarlo.
        if not any(
            name == "group" or getattr(self, name) is not None for name in self.model_fields_set
        ):
            raise ValueError("Envía al menos un dato para actualizar.")
        return self


class AssignmentSubject(BaseModel):
    id: uuid.UUID
    name: str
    code: str | None
    is_active: bool


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    subject: AssignmentSubject
    career: CareerResponse
    group: str | None = Field(description="Grupo, si lo tiene")
    hourly_rate: HourlyRateResponse = Field(
        description="Tarifa actual; cada sesión de bitácora conserva la que tenía al registrarse"
    )
    is_active: bool
    active_until: date | None = Field(description="Último día activa, si está desactivada")
    has_logbook: bool = Field(description="Tiene sesiones registradas: no se puede borrar")
    schedules: list[ScheduleResponse]
    weekly_minutes: int
    weekly_hours: Hours
    created_at: datetime
    updated_at: datetime


class AssignmentPage(Page[AssignmentResponse]):
    pass
