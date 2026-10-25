"""Materias del docente (RN-08, RN-09).

**Regla de baja:** una materia que nunca se usó en una asignación se borra. Si ya se usó,
conserva su historial y solo se desactiva (no aparece en los selectores y puede
reactivarse). Si tiene asignaciones **activas**, primero hay que desactivarlas o borrarlas:
una materia desactivada con clases vigentes sería incoherente.
"""

import uuid

from app.core.codes import ErrorCode
from app.core.exceptions import domain_error
from app.domain.subjects import format_subject_name
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.repositories.errors import ConstraintViolationError
from app.repositories.subject import SubjectRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.common import PageParams, StatusFilter
from app.schemas.subjects import (
    SubjectCreate,
    SubjectPage,
    SubjectRemovalOutcome,
    SubjectRemovalResponse,
    SubjectResponse,
    SubjectUpdate,
)
from app.services.constraints import translate_constraint


class SubjectService:
    def __init__(self, subjects: SubjectRepository, unit_of_work: UnitOfWork) -> None:
        self._subjects = subjects
        self._unit_of_work = unit_of_work

    def search(
        self, teacher: Teacher, *, search: str | None, status: StatusFilter, page: PageParams
    ) -> SubjectPage:
        subjects, total = self._subjects.search(
            teacher.id,
            term=search.strip() if search else None,
            is_active=status.is_active,
            offset=page.offset,
            limit=page.page_size,
        )
        result: SubjectPage = SubjectPage.build(self._responses(subjects), page, total)
        return result

    def get(self, teacher: Teacher, subject_id: uuid.UUID) -> SubjectResponse:
        return self._response(self.require(teacher, subject_id))

    def require(self, teacher: Teacher, subject_id: uuid.UUID) -> Subject:
        """La materia del docente; 404 si no existe **o es de otro docente** (RN-04)."""
        subject = self._subjects.get_for_teacher(teacher.id, subject_id)
        if subject is None:
            raise domain_error(ErrorCode.SUBJECT_NOT_FOUND)
        return subject

    def create(self, teacher: Teacher, data: SubjectCreate) -> SubjectResponse:
        name = format_subject_name(data.name)
        self._ensure_name_available(teacher, name)
        try:
            with self._unit_of_work.transaction():
                subject = self._subjects.add(
                    Subject(teacher_id=teacher.id, name=name, code=data.code)
                )
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._response(subject)

    def update(
        self, teacher: Teacher, subject_id: uuid.UUID, data: SubjectUpdate
    ) -> SubjectResponse:
        subject = self.require(teacher, subject_id)
        if data.name is not None:
            name = format_subject_name(data.name)
            self._ensure_name_available(teacher, name, exclude=subject)
            subject.name = name
        if "code" in data.model_fields_set:
            subject.code = data.code
        try:
            with self._unit_of_work.transaction():
                self._subjects.flush()
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return self._response(subject)

    def remove(self, teacher: Teacher, subject_id: uuid.UUID) -> SubjectRemovalResponse:
        subject = self.require(teacher, subject_id)
        active, total = self._subjects.assignment_counts([subject.id]).get(subject.id, (0, 0))
        if active:
            raise domain_error(
                ErrorCode.SUBJECT_HAS_ACTIVE_ASSIGNMENTS, details={"active_assignments": active}
            )
        try:
            with self._unit_of_work.transaction():
                if total:
                    subject.is_active = False
                    self._subjects.flush()
                else:
                    self._subjects.delete(subject)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        if total:
            return SubjectRemovalResponse(
                outcome=SubjectRemovalOutcome.DEACTIVATED, subject=self._response(subject)
            )
        return SubjectRemovalResponse(outcome=SubjectRemovalOutcome.DELETED, subject=None)

    def reactivate(self, teacher: Teacher, subject_id: uuid.UUID) -> SubjectResponse:
        subject = self.require(teacher, subject_id)
        if not subject.is_active:
            with self._unit_of_work.transaction():
                subject.is_active = True
                self._subjects.flush()
        return self._response(subject)

    def _ensure_name_available(
        self, teacher: Teacher, name: str, *, exclude: Subject | None = None
    ) -> None:
        existing = self._subjects.get_by_name(teacher.id, name)
        if existing is None or existing is exclude:
            return
        suffix = "" if existing.is_active else " Está desactivada: reactívala para usarla."
        raise domain_error(
            ErrorCode.SUBJECT_ALREADY_EXISTS,
            f"Ya registraste la materia «{existing.name}».{suffix} Usa la que ya existe.",
            details={
                "subject_id": str(existing.public_id),
                "subject_name": existing.name,
                "is_active": existing.is_active,
            },
        )

    def _response(self, subject: Subject) -> SubjectResponse:
        return self._responses([subject])[0]

    def _responses(self, subjects: list[Subject]) -> list[SubjectResponse]:
        counts = self._subjects.assignment_counts([subject.id for subject in subjects])
        return [
            SubjectResponse(
                id=subject.public_id,
                name=subject.name,
                code=subject.code,
                is_active=subject.is_active,
                active_assignment_count=counts.get(subject.id, (0, 0))[0],
                assignment_count=counts.get(subject.id, (0, 0))[1],
                created_at=subject.created_at,
                updated_at=subject.updated_at,
            )
            for subject in subjects
        ]
