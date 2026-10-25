"""Resumen para el panel principal del docente."""

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import Hours, Money, PeriodResponse
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


class PendingSessionsSummary(BaseModel):
    count: int = Field(description="Clases ya concluidas de la quincena sin registrar")
    total_minutes: int


class DashboardSummaryResponse(BaseModel):
    current_period: CurrentPeriodSummary
    today: TodaySummary
    pending_sessions: PendingSessionsSummary
    latest_receipts: list[ReceiptSummary]
