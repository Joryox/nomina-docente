"""Contratos de las asignaciones: materia + carrera + tarifa (RN-13 a RN-15)."""

import uuid
from datetime import date, datetime
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.core.constants import CATALOG_CODE_MAX_LENGTH
from app.schemas.catalogs import CareerResponse, HourlyRateResponse
from app.schemas.common import Hours, MoneyInput, Page, StrictInput
from app.schemas.schedules import ScheduleResponse

CareerCode = Annotated[
    str,
    StringConstraints(
        min_length=1, max_length=CATALOG_CODE_MAX_LENGTH, pattern=r"^[A-Z][A-Z0-9]*$"
    ),
]


class AssignmentCreate(StrictInput):
    subject_id: uuid.UUID = Field(description="Materia del docente (activa)")
    career_code: CareerCode = Field(description="Clave de una carrera activa del catálogo")
    hourly_rate: MoneyInput = Field(description="Importe de una tarifa vigente del catálogo")

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "subject_id": "0b5c2f8e-1f7a-4d6e-9a43-6c1d2e3f4a5b",
                    "career_code": "ISC",
                    "hourly_rate": "135.00",
                }
            ]
        },
    )


class AssignmentUpdate(StrictInput):
    """Cambiar la tarifa siempre se permite y solo afecta a las sesiones que se registren
    después. Cambiar la materia o la carrera solo se permite si no hay bitácora."""

    subject_id: uuid.UUID | None = None
    career_code: CareerCode | None = None
    hourly_rate: MoneyInput | None = None

    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"hourly_rate": "145.00"}]}
    )

    @model_validator(mode="after")
    def _require_changes(self) -> Self:
        if not any(getattr(self, name) is not None for name in self.model_fields_set):
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
