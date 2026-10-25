"""Contratos de la bitácora de sesiones impartidas (RN-19 a RN-23).

Las horas y el importe nunca los envía el cliente: el servidor calcula los minutos a partir
de la entrada y la salida, y toma la tarifa de la asignación al registrar la sesión.
"""

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

from app.core.constants import LOGBOOK_NOTES_MAX_LENGTH, QUICK_LOGBOOK_MAX_ENTRIES, Weekday
from app.schemas.common import (
    AssignmentSummary,
    ClockTime,
    Hours,
    Money,
    Page,
    PeriodResponse,
    StrictInput,
    WarningItem,
)


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip() or None
    return value


_NotesText = Annotated[str, StringConstraints(max_length=LOGBOOK_NOTES_MAX_LENGTH)]
Notes = Annotated[_NotesText | None, BeforeValidator(_blank_to_none)]


class LogbookEntryCreate(StrictInput):
    assignment_id: uuid.UUID
    session_date: date
    start_time: ClockTime
    end_time: ClockTime
    notes: Notes = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "assignment_id": "6f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f",
                    "session_date": "2026-10-19",
                    "start_time": "07:00",
                    "end_time": "09:00",
                    "notes": "Práctica de normalización",
                }
            ]
        },
    )


class LogbookEntryUpdate(StrictInput):
    """Solo cambia los campos enviados; ``notes: null`` borra las observaciones."""

    assignment_id: uuid.UUID | None = None
    session_date: date | None = None
    start_time: ClockTime | None = None
    end_time: ClockTime | None = None
    notes: Notes = None

    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"end_time": "08:50"}]}
    )

    @model_validator(mode="after")
    def _require_changes(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Envía al menos un dato para actualizar.")
        for required in ("assignment_id", "session_date", "start_time", "end_time"):
            if required in self.model_fields_set and getattr(self, required) is None:
                raise ValueError("La asignación, la fecha y las horas no pueden quedar vacías.")
        return self


class PeriodRef(BaseModel):
    year: int
    month: int
    fortnight: int


class LogbookEntryResponse(BaseModel):
    id: uuid.UUID
    assignment: AssignmentSummary
    session_date: date
    start_time: ClockTime
    end_time: ClockTime
    minutes: int = Field(description="Calculados por el servidor")
    hours: Hours
    hourly_rate: Money = Field(description="Tarifa congelada al registrar la sesión")
    notes: str | None
    period: PeriodRef
    is_locked: bool = Field(description="Su quincena ya tiene recibo emitido (RN-23)")
    matches_schedule: bool = Field(description="Coincide con un horario de la asignación")
    created_at: datetime
    updated_at: datetime


class LogbookEntryResult(BaseModel):
    entry: LogbookEntryResponse
    warnings: list[WarningItem]


class LogbookTotals(BaseModel):
    session_count: int
    total_minutes: int
    total_hours: Hours


class LogbookPage(Page[LogbookEntryResponse]):
    totals: LogbookTotals = Field(description="Totales de todo el filtro, no solo de la página")


class ScheduledClass(BaseModel):
    schedule_id: uuid.UUID
    assignment: AssignmentSummary
    start_time: ClockTime = Field(description="Hora de entrada del horario (precarga)")
    end_time: ClockTime = Field(description="Hora de salida del horario (precarga)")
    is_due: bool = Field(description="La clase ya terminó: se puede registrar")
    registered: bool
    logbook_entry_id: uuid.UUID | None


class ScheduledClassesResponse(BaseModel):
    date: date
    weekday: Weekday
    period: PeriodResponse
    is_locked: bool = Field(description="La quincena ya tiene recibo emitido")
    classes: list[ScheduledClass]


class QuickLogbookItem(StrictInput):
    schedule_id: uuid.UUID
    start_time: ClockTime | None = Field(default=None, description="Si se omite, la del horario")
    end_time: ClockTime | None = Field(default=None, description="Si se omite, la del horario")
    notes: Notes = None


class QuickLogbookRequest(StrictInput):
    """Registra varias clases de un mismo día en una sola transacción: todo o nada."""

    session_date: date
    entries: list[QuickLogbookItem] = Field(min_length=1, max_length=QUICK_LOGBOOK_MAX_ENTRIES)

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "session_date": "2026-10-19",
                    "entries": [
                        {"schedule_id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"},
                        {
                            "schedule_id": "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
                            "end_time": "12:50",
                        },
                    ],
                }
            ]
        },
    )

    @model_validator(mode="after")
    def _unique_schedules(self) -> Self:
        ids = [entry.schedule_id for entry in self.entries]
        if len(ids) != len(set(ids)):
            raise ValueError("Cada horario se registra una sola vez.")
        return self


class QuickLogbookResponse(BaseModel):
    results: list[LogbookEntryResult]
