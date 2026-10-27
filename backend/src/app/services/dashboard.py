"""Resumen del panel principal: quincena actual, clases de hoy, pendientes, recibos,
quincenas sin recibo y avance de la configuración inicial."""

from dataclasses import dataclass

from app.core.clock import BusinessCalendar
from app.core.constants import DASHBOARD_LATEST_RECEIPTS
from app.domain.periods import Period
from app.models.teacher import Teacher
from app.repositories.assignment import AssignmentRepository
from app.repositories.logbook import LogbookFilter, LogbookRepository
from app.repositories.schedule import ScheduleRepository
from app.repositories.subject import SubjectRepository
from app.schemas.dashboard import (
    CurrentPeriodSummary,
    DashboardSummaryResponse,
    SetupProgress,
    TodaySummary,
)
from app.services.logbook import LogbookService
from app.services.payroll import PayrollService


@dataclass(frozen=True)
class SetupRepositories:
    """Repositorios que el panel consulta para saber qué ha configurado el docente."""

    subjects: SubjectRepository
    assignments: AssignmentRepository
    schedules: ScheduleRepository
    logbook: LogbookRepository


class DashboardService:
    def __init__(
        self,
        payroll: PayrollService,
        logbook: LogbookService,
        setup: SetupRepositories,
        calendar: BusinessCalendar,
    ) -> None:
        self._payroll = payroll
        self._logbook = logbook
        self._setup = setup
        self._calendar = calendar

    def summary(self, teacher: Teacher) -> DashboardSummaryResponse:
        today = self._calendar.today()
        period = Period.containing(today)
        preview = self._payroll.preview(teacher, period)
        scheduled = self._logbook.scheduled_for_date(teacher, today)
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
            pending_sessions=self._payroll.pending_classes(teacher, period),
            latest_receipts=self._payroll.latest_receipts(teacher, DASHBOARD_LATEST_RECEIPTS),
            unissued_periods=self._payroll.unissued_periods(teacher),
            setup=self._setup_progress(teacher),
        )

    def _setup_progress(self, teacher: Teacher) -> SetupProgress:
        session_count, _ = self._setup.logbook.totals(LogbookFilter(teacher_id=teacher.id))
        return SetupProgress(
            subject_count=self._setup.subjects.count_active(teacher.id),
            active_assignment_count=len(self._setup.assignments.list_active(teacher.id)),
            schedule_count=len(self._setup.schedules.list_active(teacher.id)),
            session_count=session_count,
        )
