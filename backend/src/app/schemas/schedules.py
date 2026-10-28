"""Contratos de los horarios semanales (RN-16 a RN-18)."""

import uuid
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.constants import SCHEDULE_BATCH_MAX_RANGES, Weekday
from app.schemas.common import AssignmentSummary, ClockTime, Hours, StrictInput

IsoWeekday = Annotated[
    Weekday, Field(description="Día ISO 8601: 1 = lunes … 7 = domingo", examples=[1])
]


class ScheduleCreate(StrictInput):
    weekday: IsoWeekday
    start_time: ClockTime
    end_time: ClockTime

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [{"weekday": 1, "start_time": "07:00", "end_time": "09:00"}]
        },
    )


class ScheduleRangeInput(StrictInput):
    """Un rango de horas que se repite en uno o varios días."""

    weekdays: list[IsoWeekday] = Field(min_length=1, max_length=len(Weekday))
    start_time: ClockTime
    end_time: ClockTime

    @model_validator(mode="after")
    def _unique_weekdays(self) -> Self:
        if len(set(self.weekdays)) != len(self.weekdays):
            raise ValueError("Cada día se elige una sola vez en un rango.")
        return self


class ScheduleBatchCreate(StrictInput):
    """Varios días y rangos de una clase en una sola captura: se guardan todos o ninguno
    (RN-42)."""

    ranges: list[ScheduleRangeInput] = Field(min_length=1, max_length=SCHEDULE_BATCH_MAX_RANGES)

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "ranges": [
                        {"weekdays": [1, 3, 5], "start_time": "07:00", "end_time": "09:00"},
                        {"weekdays": [2], "start_time": "16:00", "end_time": "18:00"},
                    ]
                }
            ]
        },
    )


class ScheduleUpdate(StrictInput):
    weekday: IsoWeekday | None = None
    start_time: ClockTime | None = None
    end_time: ClockTime | None = None

    model_config = ConfigDict(
        extra="forbid", json_schema_extra={"examples": [{"end_time": "09:30"}]}
    )

    @model_validator(mode="after")
    def _require_changes(self) -> Self:
        sent = {name for name in self.model_fields_set if getattr(self, name) is not None}
        if not sent:
            raise ValueError("Envía al menos un dato para actualizar.")
        return self


class ScheduleResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    weekday: Weekday
    start_time: ClockTime
    end_time: ClockTime
    duration_minutes: int


class WeeklyClass(BaseModel):
    schedule_id: uuid.UUID
    assignment: AssignmentSummary
    start_time: ClockTime
    end_time: ClockTime
    duration_minutes: int


class WeeklyDay(BaseModel):
    weekday: Weekday
    classes: list[WeeklyClass] = Field(description="Ordenadas por hora de entrada")
    total_minutes: int


class WeeklyScheduleResponse(BaseModel):
    days: list[WeeklyDay] = Field(description="Siempre los 7 días, de lunes a domingo")
    total_minutes: int
    total_hours: Hours
