"""Contratos de los horarios semanales (RN-16 a RN-18)."""

import uuid
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.constants import Weekday
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
