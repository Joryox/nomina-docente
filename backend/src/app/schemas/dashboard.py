"""Resumen para el panel principal del docente."""

import uuid
from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import AssignmentSummary, ClockTime, Hours, Money, PeriodResponse
from app.schemas.logbook import ScheduledClass
from app.schemas.payroll import PeriodStatus, ReceiptSummary


class CurrentPeriodSummary(BaseModel):
    period: PeriodResponse
    status: PeriodStatus
    session_count: int
    total_minutes: int
    total_hours: Hours
    estimated_amount: Money = Field(description="Vista previa: total bruto con lo registrado")


class TodaySummary(BaseModel):
    date: date
    classes: list[ScheduledClass]
    registered_count: int
    pending_count: int = Field(description="Clases de hoy que aún no se registran")


class PendingClass(BaseModel):
    """Clase del horario que ya terminó y no está en la bitácora: se registra con
    ``POST /logbook/quick`` usando ``date`` y ``schedule_id``."""

    date: date
    schedule_id: uuid.UUID
    assignment: AssignmentSummary
    start_time: ClockTime
    end_time: ClockTime


class PendingSessionsSummary(BaseModel):
    count: int = Field(description="Clases ya concluidas de la quincena sin registrar")
    total_minutes: int
    items: list[PendingClass] = Field(
        description="Las clases pendientes, de la más reciente a la más antigua (hasta "
        "WARNING_DETAIL_MAX_ITEMS)"
    )


class SetupProgress(BaseModel):
    """Lo que el docente ya configuró: el panel guía a quien aún no tiene lo necesario."""

    subject_count: int = Field(description="Materias activas")
    active_assignment_count: int
    schedule_count: int = Field(description="Horarios de asignaciones activas")
    session_count: int = Field(description="Sesiones registradas en toda la bitácora")


class DashboardSummaryResponse(BaseModel):
    current_period: CurrentPeriodSummary
    today: TodaySummary
    pending_sessions: PendingSessionsSummary
    latest_receipts: list[ReceiptSummary]
    unissued_periods: list[PeriodResponse] = Field(
        description="Quincenas terminadas con sesiones y sin recibo, de la más reciente a la "
        "más antigua"
    )
    setup: SetupProgress
