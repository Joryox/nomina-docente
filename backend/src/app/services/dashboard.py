"""Resumen del panel principal: quincena actual, clases de hoy, pendientes y recibos."""

from app.core.clock import BusinessCalendar
from app.core.constants import DASHBOARD_LATEST_RECEIPTS
from app.domain.periods import Period
from app.models.teacher import Teacher
from app.schemas.dashboard import (
    CurrentPeriodSummary,
    DashboardSummaryResponse,
    PendingSessionsSummary,
    TodaySummary,
)
from app.services.logbook import LogbookService
from app.services.payroll import PayrollService


class DashboardService:
    def __init__(
        self, payroll: PayrollService, logbook: LogbookService, calendar: BusinessCalendar
    ) -> None:
        self._payroll = payroll
        self._logbook = logbook
        self._calendar = calendar

    def summary(self, teacher: Teacher) -> DashboardSummaryResponse:
        today = self._calendar.today()
        period = Period.containing(today)
        preview = self._payroll.preview(teacher, period)
        scheduled = self._logbook.scheduled_for_date(teacher, today)
        pending = self._payroll.pending_classes(teacher, period)
        registered = sum(1 for item in scheduled.classes if item.registered)
        return DashboardSummaryResponse(
            current_period=CurrentPeriodSummary(
                period=preview.period,
                status=preview.status,
                session_count=preview.session_count,
                total_minutes=preview.total_minutes,
                total_hours=preview.total_hours,
                estimated_amount=preview.total_amount,
            ),
            today=TodaySummary(
                date=today,
                classes=scheduled.classes,
                registered_count=registered,
                pending_count=len(scheduled.classes) - registered,
            ),
            pending_sessions=PendingSessionsSummary(
                count=len(pending),
                total_minutes=sum(item.slot.time_range.minutes for item in pending),
            ),
            latest_receipts=self._payroll.latest_receipts(teacher, DASHBOARD_LATEST_RECEIPTS),
        )
