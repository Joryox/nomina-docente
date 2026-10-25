"""Bitácora de sesiones impartidas (RN-19 a RN-23).

Validaciones de una sesión, en este orden (la primera que falla responde):

1. Duración: salida posterior a la entrada y dentro de los límites configurados (RN-17).
2. Fecha no futura y, si es hoy, la clase ya terminó (RN-22).
3. Antigüedad máxima ``LOGBOOK_MAX_AGE_DAYS`` al registrar o al cambiar la fecha.
4. La asignación estaba activa en esa fecha (``active_until``).
5. La quincena no tiene recibo emitido (RN-23).
6. No se empalma con otra sesión del docente ese día (RN-22).

Si la sesión no coincide con el horario programado se registra igual, con una advertencia.
Las escrituras bloquean primero la fila del docente (``TeacherRepository.lock``) para no
competir con la emisión de un recibo de la misma quincena.
"""

import uuid
from datetime import date

from app.core.clock import BusinessCalendar
from app.core.codes import ErrorCode, WarningCode
from app.core.constants import CLOCK_TIME_FORMAT, WEEKDAY_NAMES, Weekday
from app.core.exceptions import DomainError, domain_error
from app.domain.attendance import (
    RecordedSession,
    ScheduledSlot,
    ScheduleMatch,
    is_due,
    occurrences,
    schedule_match,
)
from app.domain.money import minutes_to_hours
from app.domain.periods import Period, long_date
from app.domain.time_ranges import TimeRange
from app.models.assignment import Assignment
from app.models.logbook_entry import LogbookEntry
from app.models.schedule import Schedule
from app.models.teacher import Teacher
from app.repositories.assignment import AssignmentRepository
from app.repositories.errors import ConstraintViolationError
from app.repositories.logbook import LogbookFilter, LogbookRepository
from app.repositories.payroll_receipt import PayrollReceiptRepository
from app.repositories.schedule import ScheduleRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.common import PageParams, WarningItem
from app.schemas.logbook import (
    LogbookEntryCreate,
    LogbookEntryResponse,
    LogbookEntryResult,
    LogbookEntryUpdate,
    LogbookPage,
    LogbookTotals,
    PeriodRef,
    QuickLogbookRequest,
    QuickLogbookResponse,
    ScheduledClass,
    ScheduledClassesResponse,
)
from app.services.constraints import translate_constraint
from app.services.policy import BusinessPolicy
from app.services.presenters import (
    assignment_summary,
    period_response,
    receipt_period,
    schedule_range,
)
from app.services.schedules import describe_class, ensure_valid_duration


def entry_range(entry: LogbookEntry) -> TimeRange:
    return TimeRange(entry.start_time, entry.end_time)


def slots_of(schedules: list[Schedule]) -> list[ScheduledSlot]:
    return [
        ScheduledSlot(
            slot_key=schedule.id,
            assignment_key=schedule.assignment_id,
            weekday=schedule.weekday,
            time_range=schedule_range(schedule),
        )
        for schedule in schedules
    ]


def recorded(entries: list[LogbookEntry]) -> list[RecordedSession]:
    return [
        RecordedSession(
            entry_key=entry.id,
            assignment_key=entry.assignment_id,
            day=entry.session_date,
            time_range=entry_range(entry),
        )
        for entry in entries
    ]


class LogbookService:
    def __init__(
        self,
        assignments: AssignmentRepository,
        schedules: ScheduleRepository,
        logbook: LogbookRepository,
        receipts: PayrollReceiptRepository,
        teachers: TeacherRepository,
        unit_of_work: UnitOfWork,
        calendar: BusinessCalendar,
        policy: BusinessPolicy,
    ) -> None:
        self._assignments = assignments
        self._schedules = schedules
        self._logbook = logbook
        self._receipts = receipts
        self._teachers = teachers
        self._unit_of_work = unit_of_work
        self._calendar = calendar
        self._policy = policy

    # --- Consultas ------------------------------------------------------------------------
    def search(
        self,
        teacher: Teacher,
        *,
        date_from: date | None,
        date_to: date | None,
        assignment_id: uuid.UUID | None,
        period: Period | None,
        page: PageParams,
    ) -> LogbookPage:
        if period is not None:
            date_from = max(date_from or period.start, period.start)
            date_to = min(date_to or period.end, period.end)
        if date_from is not None and date_to is not None and date_from > date_to:
            raise domain_error(
                ErrorCode.VALIDATION_ERROR,
                "La fecha inicial debe ser anterior o igual a la fecha final.",
                details={"fields": [{"location": ["query", "date_from"]}]},
            )
        assignment_key = None
        if assignment_id is not None:
            assignment_key = self._require_assignment(teacher, assignment_id).id
        criteria = LogbookFilter(teacher.id, date_from, date_to, assignment_key)
        entries, total = self._logbook.search(criteria, offset=page.offset, limit=page.page_size)
        count, minutes = self._logbook.totals(criteria)
        totals = LogbookTotals(
            session_count=count, total_minutes=minutes, total_hours=minutes_to_hours(minutes)
        )
        result: LogbookPage = LogbookPage.build(
            self._responses(teacher, entries), page, total, totals=totals
        )
        return result

    def get(self, teacher: Teacher, entry_id: uuid.UUID) -> LogbookEntryResponse:
        return self._responses(teacher, [self._require_entry(teacher, entry_id)])[0]

    def scheduled_for_date(self, teacher: Teacher, day: date) -> ScheduledClassesResponse:
        """Clases del horario para el día de la semana de ``day``, con entrada y salida
        precargadas y si ya están registradas (RN-21)."""
        schedules = {
            schedule.id: schedule
            for schedule in self._schedules.list_active(teacher.id, weekday=day.isoweekday())
        }
        entries = {entry.id: entry for entry in self._logbook.in_range(teacher.id, day, day)}
        today, now = self._calendar.today(), self._calendar.current_time()
        classes = []
        for occurrence in occurrences(
            slots_of(list(schedules.values())), recorded(list(entries.values())), [day]
        ):
            schedule = schedules[occurrence.slot.slot_key]
            entry = entries[occurrence.session.entry_key] if occurrence.session else None
            classes.append(
                ScheduledClass(
                    schedule_id=schedule.public_id,
                    assignment=assignment_summary(schedule.assignment),
                    start_time=schedule.start_time,
                    end_time=schedule.end_time,
                    is_due=is_due(day, schedule.end_time, today, now),
                    registered=entry is not None,
                    logbook_entry_id=entry.public_id if entry else None,
                )
            )
        return ScheduledClassesResponse(
            date=day,
            weekday=Weekday(day.isoweekday()),
            period=period_response(Period.containing(day), today),
            is_locked=self._receipts.is_locked(teacher.id, day),
            classes=classes,
        )

    # --- Escrituras -----------------------------------------------------------------------
    def create(self, teacher: Teacher, data: LogbookEntryCreate) -> LogbookEntryResult:
        assignment = self._require_assignment(teacher, data.assignment_id)
        self._teachers.lock(teacher.id)
        time_range = TimeRange(data.start_time, data.end_time)
        self._validate(teacher, assignment, data.session_date, time_range, check_age=True)
        entry = self._build_entry(teacher, assignment, data.session_date, time_range, data.notes)
        try:
            with self._unit_of_work.transaction():
                self._logbook.add(entry)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._result(teacher, self._logbook.reload(entry))

    def update(
        self, teacher: Teacher, entry_id: uuid.UUID, data: LogbookEntryUpdate
    ) -> LogbookEntryResult:
        entry = self._require_entry(teacher, entry_id)
        self._teachers.lock(teacher.id)
        self._ensure_not_locked(teacher, entry.session_date)
        assignment = entry.assignment
        if data.assignment_id is not None and data.assignment_id != assignment.public_id:
            assignment = self._require_assignment(teacher, data.assignment_id)
        day = data.session_date or entry.session_date
        time_range = TimeRange(data.start_time or entry.start_time, data.end_time or entry.end_time)
        changed_assignment = assignment.id != entry.assignment_id
        if changed_assignment or day != entry.session_date or time_range != entry_range(entry):
            self._validate(
                teacher,
                assignment,
                day,
                time_range,
                check_age=day != entry.session_date,
                exclude=entry,
            )
        try:
            with self._unit_of_work.transaction():
                if changed_assignment:
                    entry.assignment_id = assignment.id
                    # La sesión pasa a otra asignación: toma la tarifa vigente de esa.
                    entry.hourly_rate_id = assignment.hourly_rate_id
                entry.session_date = day
                entry.start_time = time_range.start
                entry.end_time = time_range.end
                if "notes" in data.model_fields_set:
                    entry.notes = data.notes
                self._logbook.flush()
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._result(teacher, self._logbook.reload(entry))

    def delete(self, teacher: Teacher, entry_id: uuid.UUID) -> None:
        entry = self._require_entry(teacher, entry_id)
        self._teachers.lock(teacher.id)
        self._ensure_not_locked(teacher, entry.session_date)
        try:
            with self._unit_of_work.transaction():
                self._logbook.delete(entry)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None

    def quick_register(self, teacher: Teacher, data: QuickLogbookRequest) -> QuickLogbookResponse:
        """Registra varias clases programadas de un día en una transacción: si una falla, no
        se registra ninguna y el error indica cuál (``details.entry_index``)."""
        day = data.session_date
        self._teachers.lock(teacher.id)
        self._ensure_not_locked(teacher, day)
        created: list[LogbookEntry] = []
        try:
            with self._unit_of_work.transaction():
                for index, item in enumerate(data.entries):
                    try:
                        schedule = self._schedules.get_for_teacher(teacher.id, item.schedule_id)
                        if schedule is None:
                            raise domain_error(ErrorCode.SCHEDULE_NOT_FOUND)
                        if schedule.weekday != day.isoweekday():
                            raise domain_error(
                                ErrorCode.SCHEDULE_NOT_ON_DATE,
                                f"El horario de {describe_class(schedule.assignment)} es de "
                                f"{WEEKDAY_NAMES[schedule.weekday]} y la fecha es "
                                f"{WEEKDAY_NAMES[day.isoweekday()]}.",
                            )
                        assignment = self._require_assignment(
                            teacher, schedule.assignment.public_id
                        )
                        time_range = TimeRange(
                            item.start_time or schedule.start_time,
                            item.end_time or schedule.end_time,
                        )
                        self._validate(teacher, assignment, day, time_range, check_age=True)
                        entry = self._build_entry(teacher, assignment, day, time_range, item.notes)
                        self._logbook.add(entry)
                        created.append(entry)
                    except DomainError as error:
                        error.details["entry_index"] = index
                        raise
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return QuickLogbookResponse(
            results=[self._result(teacher, self._logbook.reload(entry)) for entry in created]
        )

    # --- Reglas ---------------------------------------------------------------------------
    def _validate(
        self,
        teacher: Teacher,
        assignment: Assignment,
        day: date,
        time_range: TimeRange,
        *,
        check_age: bool,
        exclude: LogbookEntry | None = None,
    ) -> None:
        ensure_valid_duration(time_range, self._policy)
        today = self._calendar.today()
        if day > today:
            raise domain_error(ErrorCode.SESSION_DATE_IN_FUTURE)
        if day == today and time_range.end > self._calendar.current_time():
            raise domain_error(
                ErrorCode.SESSION_NOT_FINISHED,
                f"La sesión termina a las {time_range.end.strftime(CLOCK_TIME_FORMAT)}. "
                "Regístrala cuando haya concluido.",
            )
        max_age = self._policy.logbook_max_age_days
        if check_age and (today - day).days > max_age:
            raise domain_error(
                ErrorCode.SESSION_DATE_TOO_OLD,
                f"Solo se registran sesiones de los últimos {max_age} días. Si falta una "
                "sesión más antigua, avisa a tu coordinación.",
                details={"max_age_days": max_age},
            )
        if assignment.active_until is not None and day > assignment.active_until:
            raise domain_error(
                ErrorCode.ASSIGNMENT_INACTIVE_ON_DATE,
                f"La asignación de {describe_class(assignment)} se desactivó; su último día "
                f"activo fue el {long_date(assignment.active_until)}. Elige una fecha anterior "
                "u otra asignación.",
            )
        self._ensure_not_locked(teacher, day)
        conflicts = self._logbook.find_overlapping(
            teacher.id,
            day,
            time_range.start,
            time_range.end,
            exclude_id=exclude.id if exclude else None,
        )
        if conflicts:
            first = conflicts[0]
            raise domain_error(
                ErrorCode.SESSION_OVERLAP,
                f"La sesión se empalma con {describe_class(first.assignment)}, registrada ese "
                f"día de {entry_range(first).label()}. Revisa la hora de entrada y de salida.",
                details={
                    "conflicts": [
                        {
                            "logbook_entry_id": str(conflict.public_id),
                            "subject_name": conflict.assignment.subject.name,
                            "career_name": conflict.assignment.career.name,
                            "start_time": conflict.start_time.strftime(CLOCK_TIME_FORMAT),
                            "end_time": conflict.end_time.strftime(CLOCK_TIME_FORMAT),
                        }
                        for conflict in conflicts
                    ]
                },
            )

    def _ensure_not_locked(self, teacher: Teacher, day: date) -> None:
        if self._receipts.is_locked(teacher.id, day):
            period = Period.containing(day)
            raise domain_error(
                ErrorCode.PERIOD_LOCKED,
                f"La {period.label()} ya tiene recibo emitido: su bitácora no se puede modificar.",
                details={"year": period.year, "month": period.month, "fortnight": period.fortnight},
            )

    # --- Apoyo ----------------------------------------------------------------------------
    def _require_assignment(self, teacher: Teacher, assignment_id: uuid.UUID) -> Assignment:
        assignment = self._assignments.get_for_teacher(teacher.id, assignment_id)
        if assignment is None:
            raise domain_error(ErrorCode.ASSIGNMENT_NOT_FOUND)
        return assignment

    def _require_entry(self, teacher: Teacher, entry_id: uuid.UUID) -> LogbookEntry:
        entry = self._logbook.get_for_teacher(teacher.id, entry_id)
        if entry is None:
            raise domain_error(ErrorCode.LOGBOOK_ENTRY_NOT_FOUND)
        return entry

    @staticmethod
    def _build_entry(
        teacher: Teacher,
        assignment: Assignment,
        day: date,
        time_range: TimeRange,
        notes: str | None,
    ) -> LogbookEntry:
        return LogbookEntry(
            assignment_id=assignment.id,
            teacher_id=teacher.id,
            session_date=day,
            start_time=time_range.start,
            end_time=time_range.end,
            notes=notes,
            # Tarifa vigente al registrar: un cambio posterior de tarifa no la altera.
            hourly_rate_id=assignment.hourly_rate_id,
        )

    def _result(self, teacher: Teacher, entry: LogbookEntry) -> LogbookEntryResult:
        slots = slots_of(self._schedules.list_active(teacher.id))
        return LogbookEntryResult(
            entry=self._responses(teacher, [entry], slots)[0],
            warnings=self._schedule_warnings(entry, slots),
        )

    def _schedule_warnings(
        self, entry: LogbookEntry, slots: list[ScheduledSlot]
    ) -> list[WarningItem]:
        match = schedule_match(entry.assignment_id, entry.session_date, entry_range(entry), slots)
        if match is ScheduleMatch.NOT_SCHEDULED:
            weekday = WEEKDAY_NAMES[entry.session_date.isoweekday()]
            return [
                WarningItem(
                    code=WarningCode.SESSION_NOT_SCHEDULED,
                    message=f"{describe_class(entry.assignment)} no tiene clase programada los "
                    f"{weekday}. La sesión se registró; revisa que la fecha sea correcta.",
                )
            ]
        if match is ScheduleMatch.DIFFERENT_TIMES:
            scheduled = [
                slot.time_range.label()
                for slot in slots
                if slot.assignment_key == entry.assignment_id
                and slot.weekday == entry.session_date.isoweekday()
            ]
            return [
                WarningItem(
                    code=WarningCode.SESSION_TIMES_DIFFER,
                    message=f"El horario programado es {', '.join(scheduled)} y la sesión se "
                    f"registró de {entry_range(entry).label()}. Se guardó con las horas "
                    "capturadas.",
                    details={"scheduled": scheduled},
                )
            ]
        return []

    def _responses(
        self,
        teacher: Teacher,
        entries: list[LogbookEntry],
        slots: list[ScheduledSlot] | None = None,
    ) -> list[LogbookEntryResponse]:
        if not entries:
            return []
        if slots is None:
            slots = slots_of(self._schedules.list_active(teacher.id))
        first_day = min(entry.session_date for entry in entries)
        last_day = max(entry.session_date for entry in entries)
        locked = {
            receipt_period(receipt)
            for receipt in self._receipts.issued_between(teacher.id, first_day, last_day)
        }
        responses = []
        for entry in entries:
            period = Period.containing(entry.session_date)
            time_range = entry_range(entry)
            responses.append(
                LogbookEntryResponse(
                    id=entry.public_id,
                    assignment=assignment_summary(entry.assignment),
                    session_date=entry.session_date,
                    start_time=entry.start_time,
                    end_time=entry.end_time,
                    minutes=time_range.minutes,
                    hours=minutes_to_hours(time_range.minutes),
                    hourly_rate=entry.hourly_rate.amount,
                    notes=entry.notes,
                    period=PeriodRef(
                        year=period.year, month=period.month, fortnight=period.fortnight
                    ),
                    is_locked=period in locked,
                    matches_schedule=schedule_match(
                        entry.assignment_id, entry.session_date, time_range, slots
                    )
                    is ScheduleMatch.EXACT,
                    created_at=entry.created_at,
                    updated_at=entry.updated_at,
                )
            )
        return responses
