"""Asignaciones: materia + carrera + tarifa (RN-13 a RN-15).

- Solo se eligen carreras y tarifas **activas** del catálogo (RN-06, RN-11) y materias
  activas del propio docente.
- **Cambio de tarifa:** se permite siempre. Cada sesión de bitácora guarda la tarifa vigente
  al registrarla, así que el cambio solo afecta a las sesiones que se registren después;
  las ya registradas y los recibos emitidos no cambian.
- **Cambio de materia o carrera:** solo sin bitácora; con historial cambiaría el sentido de
  sesiones ya registradas. En ese caso se desactiva y se crea otra asignación.
- **Grupo** (RN-41): opcional y parte de la unicidad (materia + carrera + grupo). Se cambia
  siempre: no altera horas ni importes, y los recibos emitidos guardan su propia copia.
- **Desactivar** guarda el último día activo (hoy) y elimina sus horarios: una clase que ya
  no se imparte no debe ocupar el horario semanal ni bloquear otras clases. La bitácora y
  los recibos se conservan.
- **Borrar** solo si no tiene bitácora (RN-15); sus horarios se borran con ella.
"""

import uuid
from decimal import Decimal

from app.core.clock import BusinessCalendar
from app.core.codes import ErrorCode
from app.core.exceptions import domain_error
from app.domain.money import minutes_to_hours
from app.models.assignment import Assignment
from app.models.career import Career
from app.models.hourly_rate import HourlyRate
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.repositories.assignment import AssignmentRepository
from app.repositories.career import CareerRepository
from app.repositories.errors import ConstraintViolationError
from app.repositories.hourly_rate import HourlyRateRepository
from app.repositories.subject import SubjectRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.assignments import (
    AssignmentCreate,
    AssignmentPage,
    AssignmentResponse,
    AssignmentSubject,
    AssignmentUpdate,
)
from app.schemas.common import PageParams, StatusFilter
from app.services.constraints import translate_constraint
from app.services.presenters import (
    career_response,
    rate_response,
    schedule_range,
    schedule_response,
)


class AssignmentService:
    def __init__(
        self,
        assignments: AssignmentRepository,
        subjects: SubjectRepository,
        careers: CareerRepository,
        rates: HourlyRateRepository,
        unit_of_work: UnitOfWork,
        calendar: BusinessCalendar,
    ) -> None:
        self._assignments = assignments
        self._subjects = subjects
        self._careers = careers
        self._rates = rates
        self._unit_of_work = unit_of_work
        self._calendar = calendar

    def search(
        self,
        teacher: Teacher,
        *,
        status: StatusFilter,
        subject_id: uuid.UUID | None,
        career_code: str | None,
        page: PageParams,
    ) -> AssignmentPage:
        subject_key = None
        if subject_id is not None:
            subject_key = self._require_subject(teacher, subject_id).id
        assignments, total = self._assignments.search(
            teacher.id,
            is_active=status.is_active,
            subject_id=subject_key,
            career_code=career_code,
            offset=page.offset,
            limit=page.page_size,
        )
        result: AssignmentPage = AssignmentPage.build(self._responses(assignments), page, total)
        return result

    def get(self, teacher: Teacher, assignment_id: uuid.UUID) -> AssignmentResponse:
        return self._responses([self.require(teacher, assignment_id)])[0]

    def require(self, teacher: Teacher, assignment_id: uuid.UUID) -> Assignment:
        """La asignación del docente; 404 si no existe o es de otro docente (RN-04)."""
        assignment = self._assignments.get_for_teacher(teacher.id, assignment_id)
        if assignment is None:
            raise domain_error(ErrorCode.ASSIGNMENT_NOT_FOUND)
        return assignment

    def create(self, teacher: Teacher, data: AssignmentCreate) -> AssignmentResponse:
        subject = self._require_active_subject(teacher, data.subject_id)
        career = self._require_active_career(data.career_code)
        rate = self._require_active_rate(data.hourly_rate)
        self._ensure_no_duplicate(teacher, subject, career, data.group)
        try:
            with self._unit_of_work.transaction():
                assignment = self._assignments.add(
                    Assignment(
                        teacher_id=teacher.id,
                        subject_id=subject.id,
                        career_id=career.id,
                        group_code=data.group,
                        hourly_rate_id=rate.id,
                    )
                )
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._responses([self._assignments.reload(assignment)])[0]

    def update(
        self, teacher: Teacher, assignment_id: uuid.UUID, data: AssignmentUpdate
    ) -> AssignmentResponse:
        assignment = self.require(teacher, assignment_id)
        if not assignment.is_active:
            raise domain_error(ErrorCode.ASSIGNMENT_INACTIVE)
        subject = assignment.subject
        career = assignment.career
        if data.subject_id is not None and data.subject_id != subject.public_id:
            subject = self._require_active_subject(teacher, data.subject_id)
        if data.career_code is not None and data.career_code != career.code:
            career = self._require_active_career(data.career_code)
        group = data.group if "group" in data.model_fields_set else assignment.group_code
        identity_changed = subject.id != assignment.subject_id or career.id != assignment.career_id
        if identity_changed and self._assignments.with_logbook([assignment.id]):
            raise domain_error(ErrorCode.ASSIGNMENT_HAS_LOGBOOK)
        if identity_changed or group != assignment.group_code:
            self._ensure_no_duplicate(teacher, subject, career, group, exclude=assignment)
        rate_id = assignment.hourly_rate_id
        if data.hourly_rate is not None and data.hourly_rate != assignment.hourly_rate.amount:
            rate_id = self._require_active_rate(data.hourly_rate).id
        try:
            with self._unit_of_work.transaction():
                assignment.subject_id = subject.id
                assignment.career_id = career.id
                assignment.group_code = group
                assignment.hourly_rate_id = rate_id
                self._assignments.flush()
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._responses([self._assignments.reload(assignment)])[0]

    def deactivate(self, teacher: Teacher, assignment_id: uuid.UUID) -> AssignmentResponse:
        assignment = self.require(teacher, assignment_id)
        if assignment.is_active:
            with self._unit_of_work.transaction():
                assignment.is_active = False
                assignment.active_until = self._calendar.today()
                self._assignments.delete_schedules(assignment.id)
                self._assignments.flush()
        return self._responses([self._assignments.reload(assignment)])[0]

    def reactivate(self, teacher: Teacher, assignment_id: uuid.UUID) -> AssignmentResponse:
        assignment = self.require(teacher, assignment_id)
        if not assignment.is_active:
            if not assignment.subject.is_active:
                raise domain_error(ErrorCode.SUBJECT_INACTIVE)
            self._require_active_career(assignment.career.code)
            if not assignment.hourly_rate.is_active:
                raise domain_error(
                    ErrorCode.RATE_INACTIVE,
                    "La tarifa de esta asignación ya no está vigente. Crea una asignación nueva "
                    "con una tarifa vigente.",
                )
            self._ensure_no_duplicate(
                teacher,
                assignment.subject,
                assignment.career,
                assignment.group_code,
                exclude=assignment,
            )
            try:
                with self._unit_of_work.transaction():
                    assignment.is_active = True
                    assignment.active_until = None
                    self._assignments.flush()
            except ConstraintViolationError as error:
                raise translate_constraint(error) from None
        return self._responses([self._assignments.reload(assignment)])[0]

    def delete(self, teacher: Teacher, assignment_id: uuid.UUID) -> None:
        assignment = self.require(teacher, assignment_id)
        if self._assignments.with_logbook([assignment.id]):
            raise domain_error(ErrorCode.ASSIGNMENT_HAS_LOGBOOK)
        try:
            with self._unit_of_work.transaction():
                self._assignments.delete(assignment)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None

    def _require_subject(self, teacher: Teacher, subject_id: uuid.UUID) -> Subject:
        subject = self._subjects.get_for_teacher(teacher.id, subject_id)
        if subject is None:
            raise domain_error(ErrorCode.SUBJECT_NOT_FOUND)
        return subject

    def _require_active_subject(self, teacher: Teacher, subject_id: uuid.UUID) -> Subject:
        subject = self._require_subject(teacher, subject_id)
        if not subject.is_active:
            raise domain_error(ErrorCode.SUBJECT_INACTIVE)
        return subject

    def _require_active_career(self, code: str) -> Career:
        career = self._careers.get_by_code(code)
        if career is None:
            raise domain_error(ErrorCode.CAREER_NOT_FOUND)
        if not career.is_active:
            raise domain_error(ErrorCode.CAREER_INACTIVE)
        return career

    def _require_active_rate(self, amount: Decimal) -> HourlyRate:
        rate = self._rates.get_by_amount(amount)
        if rate is None:
            raise domain_error(ErrorCode.RATE_NOT_FOUND)
        if not rate.is_active:
            raise domain_error(ErrorCode.RATE_INACTIVE)
        return rate

    def _ensure_no_duplicate(
        self,
        teacher: Teacher,
        subject: Subject,
        career: Career,
        group: str | None,
        *,
        exclude: Assignment | None = None,
    ) -> None:
        duplicate = self._assignments.find_active_duplicate(
            teacher.id, subject.id, career.id, group, exclude_id=exclude.id if exclude else None
        )
        if duplicate is not None:
            which = f"del grupo {group}" if group else "sin grupo"
            raise domain_error(
                ErrorCode.ASSIGNMENT_ALREADY_EXISTS,
                f"Ya tienes una asignación activa de {subject.name} en {career.name} {which}. "
                "Usa otro grupo o cambia la tarifa de la existente.",
                details={"assignment_id": str(duplicate.public_id), "group": group},
            )

    def _responses(self, assignments: list[Assignment]) -> list[AssignmentResponse]:
        with_logbook = self._assignments.with_logbook([a.id for a in assignments])
        responses = []
        for assignment in assignments:
            weekly_minutes = sum(schedule_range(s).minutes for s in assignment.schedules)
            responses.append(
                AssignmentResponse(
                    id=assignment.public_id,
                    subject=AssignmentSubject(
                        id=assignment.subject.public_id,
                        name=assignment.subject.name,
                        code=assignment.subject.code,
                        is_active=assignment.subject.is_active,
                    ),
                    career=career_response(assignment.career),
                    group=assignment.group_code,
                    hourly_rate=rate_response(assignment.hourly_rate),
                    is_active=assignment.is_active,
                    active_until=assignment.active_until,
                    has_logbook=assignment.id in with_logbook,
                    schedules=[schedule_response(s, assignment) for s in assignment.schedules],
                    weekly_minutes=weekly_minutes,
                    weekly_hours=minutes_to_hours(weekly_minutes),
                    created_at=assignment.created_at,
                    updated_at=assignment.updated_at,
                )
            )
        return responses
