"""Carga de la cuenta de demostración **a través de los servicios** del sistema.

No se escribe nada directo en las tablas de negocio: materias, asignaciones, horarios,
sesiones y recibos pasan por las mismas validaciones que una petición real. Para registrar
la bitácora de quincenas anteriores, el calendario del negocio «viaja» a la fecha de cada
sesión (con ``MovableClock``), y los recibos se emiten al día siguiente de cada quincena.

Es idempotente: lo que ya existe se conserva y solo se agrega lo que falta.
"""

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.clock import BusinessCalendar, utc_now
from app.core.config import Settings
from app.core.constants import TIMEZONE, RoleCode
from app.core.security.password_policy import PasswordPolicy, get_common_passwords
from app.core.security.passwords import PasswordHasher
from app.demo import data
from app.domain.periods import Period
from app.models.assignment import Assignment
from app.models.teacher import Teacher
from app.models.user import User
from app.repositories.assignment import AssignmentRepository
from app.repositories.career import CareerRepository
from app.repositories.hourly_rate import HourlyRateRepository
from app.repositories.logbook import LogbookRepository
from app.repositories.payroll_receipt import PayrollReceiptRepository
from app.repositories.role import RoleRepository
from app.repositories.schedule import ScheduleRepository
from app.repositories.subject import SubjectRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.repositories.user import UserRepository
from app.schemas.assignments import AssignmentCreate, AssignmentUpdate
from app.schemas.logbook import LogbookEntryCreate
from app.schemas.payroll import InstitutionResponse
from app.schemas.schedules import ScheduleCreate
from app.schemas.subjects import SubjectCreate
from app.services.assignments import AssignmentService
from app.services.logbook import LogbookService
from app.services.payroll import PayrollService
from app.services.policy import BusinessPolicy
from app.services.schedules import ScheduleService
from app.services.subjects import SubjectService


class DemoDataError(RuntimeError):
    """La base no está lista para la demostración (por ejemplo, faltan los catálogos)."""


class MovableClock:
    """Reloj que la carga mueve a la fecha de cada operación."""

    def __init__(self) -> None:
        self.now = utc_now()

    def __call__(self) -> datetime:
        return self.now

    def move_to(self, day: date, hour: int) -> None:
        self.now = datetime.combine(day, time(hour), tzinfo=ZoneInfo(TIMEZONE)).astimezone(UTC)


@dataclass
class DemoReport:
    account_created: bool = False
    subjects: int = 0
    assignments: int = 0
    schedules: int = 0
    sessions: int = 0
    receipts: list[str] = field(default_factory=list)


class DemoLoader:
    def __init__(self, session: Session, settings: Settings, today: date) -> None:
        self._session = session
        self._settings = settings
        self._today = today
        self._clock = MovableClock()
        calendar = BusinessCalendar(self._clock)
        policy = BusinessPolicy.from_settings(settings)
        uow = UnitOfWork(session)
        self._subject_repo = SubjectRepository(session)
        self._assignment_repo = AssignmentRepository(session)
        self._logbook_repo = LogbookRepository(session)
        self._receipt_repo = PayrollReceiptRepository(session)
        self._subjects = SubjectService(self._subject_repo, uow)
        self._assignments = AssignmentService(
            self._assignment_repo,
            self._subject_repo,
            CareerRepository(session),
            HourlyRateRepository(session),
            uow,
            calendar,
        )
        self._schedules = ScheduleService(
            self._assignment_repo, ScheduleRepository(session), uow, policy
        )
        self._logbook = LogbookService(
            self._assignment_repo,
            ScheduleRepository(session),
            self._logbook_repo,
            self._receipt_repo,
            TeacherRepository(session),
            uow,
            calendar,
            policy,
        )
        self._payroll = PayrollService(
            self._logbook_repo,
            ScheduleRepository(session),
            self._receipt_repo,
            TeacherRepository(session),
            uow,
            calendar,
            policy,
            InstitutionResponse(
                name=settings.institution_name, short_name=settings.institution_short_name
            ),
            settings.payroll_folio_prefix,
        )
        self.report = DemoReport()

    def run(self) -> DemoReport:
        self._clock.move_to(self._history()[0].start, data.ISSUE_HOUR)
        teacher = self._ensure_account()
        assignments = [self._ensure_assignment(teacher, spec) for spec in data.ASSIGNMENTS]
        periods = self._history()
        to_issue = periods[:-2]  # todas las anteriores menos la más reciente; la actual no
        for index, period in enumerate(periods):
            self._log_period(teacher, assignments, period)
            if period in to_issue:
                self._issue(teacher, period)
            if index == 0:
                self._change_rates(teacher, assignments)
        return self.report

    # --- Pasos ----------------------------------------------------------------------------
    def _history(self) -> list[Period]:
        """Quincenas anteriores a la actual (``HISTORY_PERIODS``) y la actual, en orden."""
        current = Period.containing(self._today)
        periods = [current]
        for _ in range(data.HISTORY_PERIODS):
            periods.insert(0, periods[0].previous())
        return periods

    def _ensure_account(self) -> Teacher:
        users = UserRepository(self._session)
        user = users.get_by_email(data.DEMO_EMAIL)
        if user is not None:
            if user.teacher is None:
                raise DemoDataError(f"{data.DEMO_EMAIL} existe pero no tiene perfil de docente.")
            return user.teacher
        role = RoleRepository(self._session).get_by_code(RoleCode.TEACHER)
        if role is None:
            raise DemoDataError("Faltan los catálogos: ejecuta primero scripts/seed.sh.")
        self._check_password_policy()
        with UnitOfWork(self._session).transaction():
            user = users.add(
                User(email=data.DEMO_EMAIL, password_hash=PasswordHasher().hash(data.DEMO_PASSWORD))
            )
            user.roles.append(role)
            teacher = TeacherRepository(self._session).add(
                Teacher(
                    user_id=user.id,
                    first_names=data.DEMO_FIRST_NAMES,
                    paternal_surname=data.DEMO_PATERNAL_SURNAME,
                    maternal_surname=data.DEMO_MATERNAL_SURNAME,
                    employee_number=data.DEMO_EMPLOYEE_NUMBER,
                )
            )
        self.report.account_created = True
        return teacher

    def _check_password_policy(self) -> None:
        policy = PasswordPolicy(
            min_length=self._settings.password_min_length,
            common_passwords=get_common_passwords(),
        )
        personal = [
            data.DEMO_EMAIL,
            data.DEMO_FIRST_NAMES,
            data.DEMO_PATERNAL_SURNAME,
            data.DEMO_MATERNAL_SURNAME,
        ]
        if policy.violations(data.DEMO_PASSWORD, personal):
            raise DemoDataError("La contraseña de demostración no cumple la política vigente.")

    def _ensure_assignment(self, teacher: Teacher, spec: data.DemoAssignment) -> Assignment:
        subject = self._subject_repo.get_by_name(teacher.id, spec.subject)
        if subject is None:
            created = self._subjects.create(
                teacher, SubjectCreate(name=spec.subject, code=spec.subject_code)
            )
            subject = self._subjects.require(teacher, created.id)
            self.report.subjects += 1
        career = CareerRepository(self._session).get_by_code(spec.career_code)
        if career is None:
            raise DemoDataError(
                f"No existe la carrera {spec.career_code}: ejecuta scripts/seed.sh."
            )
        duplicate = self._assignment_repo.find_active_duplicate(teacher.id, subject.id, career.id)
        if duplicate is None:
            created_assignment = self._assignments.create(
                teacher,
                AssignmentCreate(
                    subject_id=subject.public_id,
                    career_code=spec.career_code,
                    hourly_rate=spec.hourly_rate,
                ),
            )
            self.report.assignments += 1
            public_id = created_assignment.id
        else:
            public_id = duplicate.public_id
        existing = self._assignments.require(teacher, public_id)
        current = {(s.weekday, s.start_time) for s in existing.schedules}
        for slot in spec.slots:
            if (slot.weekday, slot.start) not in current:
                self._schedules.create(
                    teacher,
                    existing.public_id,
                    ScheduleCreate(weekday=slot.weekday, start_time=slot.start, end_time=slot.end),
                )
                self.report.schedules += 1
        return self._assignments.require(teacher, existing.public_id)

    def _log_period(self, teacher: Teacher, assignments: list[Assignment], period: Period) -> None:
        if self._receipt_repo.is_locked(teacher.id, period.start):
            return
        counter = 0
        for day in period.days():
            if day >= self._today:
                break
            for assignment, spec in zip(assignments, data.ASSIGNMENTS, strict=True):
                for slot in spec.slots:
                    if slot.weekday != day.isoweekday():
                        continue
                    counter += 1
                    if counter % data.SKIP_EVERY == 0:
                        continue
                    end = slot.end
                    if counter % data.ADJUST_EVERY == 0:
                        end = (
                            datetime.combine(day, slot.end) - timedelta(minutes=data.ADJUST_MINUTES)
                        ).time()
                    if self._logbook_repo.find_overlapping(teacher.id, day, slot.start, end):
                        continue
                    self._clock.move_to(day, data.REGISTRATION_HOUR)
                    self._logbook.create(
                        teacher,
                        LogbookEntryCreate(
                            assignment_id=assignment.public_id,
                            session_date=day,
                            start_time=slot.start,
                            end_time=end,
                        ),
                    )
                    self.report.sessions += 1

    def _issue(self, teacher: Teacher, period: Period) -> None:
        existing = self._receipt_repo.get_for_period(
            teacher.id, period.year, period.month, period.fortnight
        )
        if existing is not None:
            return
        self._clock.move_to(period.end + timedelta(days=1), data.ISSUE_HOUR)
        self.report.receipts.append(self._payroll.issue(teacher, period).folio)

    def _change_rates(self, teacher: Teacher, assignments: list[Assignment]) -> None:
        for assignment, spec in zip(assignments, data.ASSIGNMENTS, strict=True):
            if spec.new_rate is None:
                continue
            current = self._assignments.require(teacher, assignment.public_id)
            if current.hourly_rate.amount == spec.hourly_rate:
                self._assignments.update(
                    teacher, assignment.public_id, AssignmentUpdate(hourly_rate=spec.new_rate)
                )
