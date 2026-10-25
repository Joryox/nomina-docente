"""Nómina quincenal: periodos, vista previa, emisión y consulta de recibos (RN-24 a RN-30).

**Vista previa y emisión usan el mismo cálculo** (``app.domain.payroll.calculate_payroll``)
sobre las mismas sesiones, así que el recibo emitido coincide con la vista previa.

**Emisión** (RN-28 a RN-30), en una sola transacción:

1. Bloquea la fila del docente: dos emisiones simultáneas del mismo periodo se atienden una
   tras otra y la segunda ve el recibo ya emitido; una sesión que se registra al mismo
   tiempo espera y después queda rechazada por el cierre del periodo (RN-23).
2. Valida: periodo no futuro, terminado (si ``PAYROLL_ISSUE_REQUIRES_CLOSED_PERIOD``), sin
   recibo previo y con al menos una sesión.
3. Pide el consecutivo a la secuencia de la base y arma el folio con el prefijo configurado.
4. Inserta el recibo y sus renglones como copia fija (nombres, tarifa, minutos e importe).
   Desde ese momento el trigger de la base cierra la bitácora del periodo.

La restricción ``UNIQUE (teacher_id, year, month, fortnight)`` respalda la regla aunque
alguien escribiera directo en la base.
"""

import uuid
from collections import defaultdict
from datetime import date

from app.core.clock import BusinessCalendar
from app.core.codes import ErrorCode, WarningCode
from app.core.constants import CLOCK_TIME_FORMAT, WARNING_DETAIL_MAX_ITEMS
from app.core.exceptions import domain_error
from app.domain.attendance import (
    ClassOccurrence,
    ScheduleMatch,
    is_due,
    occurrences,
    schedule_match,
)
from app.domain.money import sum_money
from app.domain.payroll import PayrollCalculation, SessionForPayroll, calculate_payroll
from app.domain.periods import Period, periods_of_year
from app.models.logbook_entry import LogbookEntry
from app.models.payroll_receipt import PayrollReceipt
from app.models.payroll_receipt_line import PayrollReceiptLine
from app.models.schedule import Schedule
from app.models.teacher import Teacher
from app.repositories.errors import ConstraintViolationError
from app.repositories.logbook import LogbookRepository
from app.repositories.payroll_receipt import PayrollReceiptRepository
from app.repositories.schedule import ScheduleRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.common import PageParams, WarningItem
from app.schemas.payroll import (
    InstitutionResponse,
    PayrollLineResponse,
    PayrollPreviewResponse,
    PeriodListResponse,
    PeriodStatus,
    PeriodSummary,
    ReceiptDetailResponse,
    ReceiptLineResponse,
    ReceiptPage,
    ReceiptSummary,
    ReceiptTeacher,
)
from app.services.account import full_name
from app.services.constraints import translate_constraint
from app.services.logbook import entry_range, recorded, slots_of
from app.services.policy import BusinessPolicy
from app.services.presenters import period_response, receipt_period, receipt_summary
from app.utils.folio import build_folio


def session_for_payroll(entry: LogbookEntry) -> SessionForPayroll:
    return SessionForPayroll(
        assignment_key=entry.assignment_id,
        subject_name=entry.assignment.subject.name,
        career_name=entry.assignment.career.name,
        hourly_rate=entry.hourly_rate.amount,
        minutes=entry_range(entry).minutes,
    )


def period_status(period: Period, today: date, receipt: PayrollReceipt | None) -> PeriodStatus:
    if receipt is not None:
        return PeriodStatus.ISSUED
    if period.is_future(today):
        return PeriodStatus.FUTURE
    if period.contains(today):
        return PeriodStatus.OPEN
    return PeriodStatus.CLOSED


class PayrollService:
    def __init__(
        self,
        logbook: LogbookRepository,
        schedules: ScheduleRepository,
        receipts: PayrollReceiptRepository,
        teachers: TeacherRepository,
        unit_of_work: UnitOfWork,
        calendar: BusinessCalendar,
        policy: BusinessPolicy,
        institution: InstitutionResponse,
        folio_prefix: str,
    ) -> None:
        self._logbook = logbook
        self._schedules = schedules
        self._receipts = receipts
        self._teachers = teachers
        self._unit_of_work = unit_of_work
        self._calendar = calendar
        self._policy = policy
        self._institution = institution
        self._folio_prefix = folio_prefix

    # --- Periodos y vista previa ----------------------------------------------------------
    def periods(self, teacher: Teacher, year: int) -> PeriodListResponse:
        today = self._calendar.today()
        periods = periods_of_year(year)
        issued = {
            receipt_period(receipt): receipt
            for receipt in self._receipts.issued_between(
                teacher.id, periods[0].start, periods[-1].end
            )
        }
        return PeriodListResponse(
            year=year,
            periods=[
                PeriodSummary(
                    period=period_response(period, today),
                    status=period_status(period, today, issued.get(period)),
                    receipt_id=issued[period].public_id if period in issued else None,
                    folio=issued[period].folio if period in issued else None,
                )
                for period in periods
            ],
        )

    def preview(self, teacher: Teacher, period: Period) -> PayrollPreviewResponse:
        today = self._calendar.today()
        receipt = self._find_receipt(teacher, period)
        entries = self._logbook.in_range(teacher.id, period.start, period.end)
        calculation = calculate_payroll([session_for_payroll(entry) for entry in entries])
        public_ids = {entry.assignment_id: entry.assignment.public_id for entry in entries}
        blockers = self._issue_blockers(period, today, receipt, calculation)
        return PayrollPreviewResponse(
            period=period_response(period, today),
            status=period_status(period, today, receipt),
            receipt_id=receipt.public_id if receipt else None,
            lines=[
                PayrollLineResponse(
                    assignment_id=public_ids[line.assignment_key],
                    subject_name=line.subject_name,
                    career_name=line.career_name,
                    hourly_rate=line.hourly_rate,
                    session_count=line.session_count,
                    minutes=line.minutes,
                    hours=line.hours,
                    amount=line.amount,
                )
                for line in calculation.lines
            ],
            session_count=calculation.session_count,
            total_minutes=calculation.total_minutes,
            total_hours=calculation.total_hours,
            total_amount=calculation.total_amount,
            can_issue=not blockers,
            issue_blockers=blockers,
            warnings=self._warnings(teacher, period, receipt, entries, calculation),
        )

    def pending_classes(self, teacher: Teacher, period: Period) -> list[ClassOccurrence]:
        """Clases programadas del periodo que ya terminaron y no tienen sesión registrada."""
        return self._pending(
            teacher, period, self._logbook.in_range(teacher.id, period.start, period.end)
        )[1]

    # --- Emisión --------------------------------------------------------------------------
    def issue(self, teacher: Teacher, period: Period) -> ReceiptDetailResponse:
        self._teachers.lock(teacher.id)
        today = self._calendar.today()
        existing = self._find_receipt(teacher, period)
        if existing is not None:
            raise domain_error(
                ErrorCode.RECEIPT_ALREADY_ISSUED,
                f"La {period.label()} ya tiene el recibo {existing.folio}.",
                details={"receipt_id": str(existing.public_id), "folio": existing.folio},
            )
        if period.is_future(today):
            raise domain_error(ErrorCode.PERIOD_IN_FUTURE)
        if self._policy.payroll_issue_requires_closed_period and not period.is_finished(today):
            raise domain_error(
                ErrorCode.PERIOD_NOT_FINISHED,
                f"La {period.label()} termina el {period.end.day}; emite el recibo a partir "
                "del día siguiente.",
            )
        entries = self._logbook.in_range(teacher.id, period.start, period.end)
        calculation = calculate_payroll([session_for_payroll(entry) for entry in entries])
        if calculation.is_empty:
            raise domain_error(ErrorCode.PERIOD_WITHOUT_SESSIONS)
        try:
            with self._unit_of_work.transaction():
                receipt = self._insert_receipt(teacher, period, calculation)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._detail(self._receipts.reload(receipt))

    def _insert_receipt(
        self, teacher: Teacher, period: Period, calculation: PayrollCalculation
    ) -> PayrollReceipt:
        number = self._receipts.next_folio_number()
        receipt = self._receipts.add(
            PayrollReceipt(
                teacher_id=teacher.id,
                folio_number=number,
                folio=build_folio(
                    self._folio_prefix, period.year, period.month, period.fortnight, number
                ),
                year=period.year,
                month=period.month,
                fortnight=period.fortnight,
                period_start=period.start,
                period_end=period.end,
                teacher_full_name=full_name(teacher),
                teacher_employee_number=teacher.employee_number,
                total_minutes=calculation.total_minutes,
                total_amount=calculation.total_amount,
            )
        )
        lines = [
            PayrollReceiptLine(
                receipt_id=receipt.id,
                teacher_id=teacher.id,
                assignment_id=line.assignment_key,
                subject_name=line.subject_name,
                career_name=line.career_name,
                minutes=line.minutes,
                hourly_rate=line.hourly_rate,
                amount=line.amount,
            )
            for line in calculation.lines
        ]
        self._receipts.add_lines(lines)
        # El total es la suma de los renglones (RN-26). Involucra varias filas, así que no
        # cabe en un CHECK: se comprueba aquí, dentro de la misma transacción.
        if sum_money([line.amount for line in lines]) != receipt.total_amount:
            raise RuntimeError("El total del recibo no coincide con la suma de sus renglones.")
        return receipt

    # --- Recibos --------------------------------------------------------------------------
    def list_receipts(self, teacher: Teacher, *, year: int | None, page: PageParams) -> ReceiptPage:
        receipts, total = self._receipts.search(
            teacher.id, year=year, offset=page.offset, limit=page.page_size
        )
        today = self._calendar.today()
        result: ReceiptPage = ReceiptPage.build(
            [receipt_summary(receipt, today) for receipt in receipts], page, total
        )
        return result

    def latest_receipts(self, teacher: Teacher, limit: int) -> list[ReceiptSummary]:
        today = self._calendar.today()
        return [receipt_summary(r, today) for r in self._receipts.latest(teacher.id, limit)]

    def get_receipt(self, teacher: Teacher, receipt_id: uuid.UUID) -> ReceiptDetailResponse:
        receipt = self._receipts.get_for_teacher(teacher.id, receipt_id)
        if receipt is None:
            raise domain_error(ErrorCode.RECEIPT_NOT_FOUND)
        return self._detail(receipt)

    def _detail(self, receipt: PayrollReceipt) -> ReceiptDetailResponse:
        return ReceiptDetailResponse(
            id=receipt.public_id,
            folio=receipt.folio,
            institution=self._institution,
            teacher=ReceiptTeacher(
                full_name=receipt.teacher_full_name,
                employee_number=receipt.teacher_employee_number,
            ),
            period=period_response(receipt_period(receipt), self._calendar.today()),
            issued_at=receipt.issued_at,
            lines=[
                ReceiptLineResponse(
                    assignment_id=line.assignment.public_id,
                    subject_name=line.subject_name,
                    career_name=line.career_name,
                    hourly_rate=line.hourly_rate,
                    minutes=line.minutes,
                    hours=line.hours,
                    amount=line.amount,
                )
                for line in receipt.lines
            ],
            total_minutes=receipt.total_minutes,
            total_hours=receipt.total_hours,
            total_amount=receipt.total_amount,
        )

    # --- Apoyo ----------------------------------------------------------------------------
    def _find_receipt(self, teacher: Teacher, period: Period) -> PayrollReceipt | None:
        return self._receipts.get_for_period(
            teacher.id, period.year, period.month, period.fortnight
        )

    def _issue_blockers(
        self,
        period: Period,
        today: date,
        receipt: PayrollReceipt | None,
        calculation: PayrollCalculation,
    ) -> list[ErrorCode]:
        blockers = []
        if receipt is not None:
            blockers.append(ErrorCode.RECEIPT_ALREADY_ISSUED)
        if period.is_future(today):
            blockers.append(ErrorCode.PERIOD_IN_FUTURE)
        elif self._policy.payroll_issue_requires_closed_period and not period.is_finished(today):
            blockers.append(ErrorCode.PERIOD_NOT_FINISHED)
        if calculation.is_empty:
            blockers.append(ErrorCode.PERIOD_WITHOUT_SESSIONS)
        return blockers

    def _pending(
        self, teacher: Teacher, period: Period, entries: list[LogbookEntry]
    ) -> tuple[dict[int, Schedule], list[ClassOccurrence]]:
        today, now = self._calendar.today(), self._calendar.current_time()
        schedules = {schedule.id: schedule for schedule in self._schedules.list_active(teacher.id)}
        days = [day for day in period.days() if day <= today]
        pending = [
            occurrence
            for occurrence in occurrences(
                slots_of(list(schedules.values())), recorded(entries), days
            )
            if not occurrence.registered
            and is_due(occurrence.day, occurrence.slot.time_range.end, today, now)
        ]
        return schedules, pending

    def _warnings(
        self,
        teacher: Teacher,
        period: Period,
        receipt: PayrollReceipt | None,
        entries: list[LogbookEntry],
        calculation: PayrollCalculation,
    ) -> list[WarningItem]:
        warnings: list[WarningItem] = []
        today = self._calendar.today()
        if receipt is None and not period.is_future(today) and not period.is_finished(today):
            warnings.append(
                WarningItem(
                    code=WarningCode.PERIOD_NOT_FINISHED,
                    message=f"La quincena termina el {period.end.day}: la vista previa puede "
                    "cambiar con las sesiones que registres.",
                )
            )
        if receipt is None:
            schedules, pending = self._pending(teacher, period, entries)
            if pending:
                warnings.append(self._pending_warning(schedules, pending))
        slots = slots_of(self._schedules.list_active(teacher.id))
        outside = [
            entry
            for entry in entries
            if schedule_match(entry.assignment_id, entry.session_date, entry_range(entry), slots)
            is not ScheduleMatch.EXACT
        ]
        if outside:
            warnings.append(
                WarningItem(
                    code=WarningCode.SESSIONS_OUTSIDE_SCHEDULE,
                    message=f"{len(outside)} sesión(es) no coinciden con el horario programado. "
                    "Revisa que las horas sean correctas.",
                    details={
                        "count": len(outside),
                        "items": [
                            {
                                "logbook_entry_id": str(entry.public_id),
                                "date": entry.session_date.isoformat(),
                                "subject_name": entry.assignment.subject.name,
                                "career_name": entry.assignment.career.name,
                                "start_time": entry.start_time.strftime(CLOCK_TIME_FORMAT),
                                "end_time": entry.end_time.strftime(CLOCK_TIME_FORMAT),
                            }
                            for entry in outside[:WARNING_DETAIL_MAX_ITEMS]
                        ],
                    },
                )
            )
        rates_by_assignment: dict[int, list[str]] = defaultdict(list)
        for line in calculation.lines:
            rates_by_assignment[line.assignment_key].append(f"{line.hourly_rate:.2f}")
        changed = [
            line for line in calculation.lines if len(rates_by_assignment[line.assignment_key]) > 1
        ]
        if changed:
            warnings.append(
                WarningItem(
                    code=WarningCode.ASSIGNMENT_RATE_CHANGED,
                    message="La tarifa de una asignación cambió dentro de la quincena: cada "
                    "sesión se paga con la tarifa vigente cuando se registró.",
                    details={
                        "items": [
                            {
                                "subject_name": line.subject_name,
                                "career_name": line.career_name,
                                "hourly_rate": f"{line.hourly_rate:.2f}",
                            }
                            for line in changed
                        ]
                    },
                )
            )
        return warnings

    @staticmethod
    def _pending_warning(
        schedules: dict[int, Schedule], pending: list[ClassOccurrence]
    ) -> WarningItem:
        items = []
        for occurrence in pending[:WARNING_DETAIL_MAX_ITEMS]:
            schedule = schedules[occurrence.slot.slot_key]
            items.append(
                {
                    "date": occurrence.day.isoformat(),
                    "schedule_id": str(schedule.public_id),
                    "assignment_id": str(schedule.assignment.public_id),
                    "subject_name": schedule.assignment.subject.name,
                    "career_name": schedule.assignment.career.name,
                    "start_time": schedule.start_time.strftime(CLOCK_TIME_FORMAT),
                    "end_time": schedule.end_time.strftime(CLOCK_TIME_FORMAT),
                }
            )
        return WarningItem(
            code=WarningCode.SCHEDULED_CLASSES_NOT_REGISTERED,
            message=f"Hay {len(pending)} clase(s) programada(s) que ya terminaron y no están "
            "en la bitácora. Regístralas si las impartiste.",
            details={"count": len(pending), "items": items},
        )
