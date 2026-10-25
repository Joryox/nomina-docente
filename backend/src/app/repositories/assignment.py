import uuid
from collections.abc import Collection

from sqlalchemy import Select, delete, exists, select
from sqlalchemy.orm import selectinload

from app.models.assignment import Assignment
from app.models.career import Career
from app.models.logbook_entry import LogbookEntry
from app.models.schedule import Schedule
from app.repositories.base import BaseRepository


def _with_details(statement: Select[Assignment]) -> Select[Assignment]:
    return statement.options(
        selectinload(Assignment.subject),
        selectinload(Assignment.career).selectinload(Career.career_type),
        selectinload(Assignment.hourly_rate),
        selectinload(Assignment.schedules),
    )


class AssignmentRepository(BaseRepository[Assignment]):
    """Asignaciones de un docente con su materia, carrera, tarifa y horarios (RN-04)."""

    model = Assignment

    def get_for_teacher(self, teacher_id: int, public_id: uuid.UUID) -> Assignment | None:
        statement = select(Assignment).where(
            Assignment.teacher_id == teacher_id, Assignment.public_id == public_id
        )
        return self._session.scalars(_with_details(statement)).one_or_none()

    def reload(self, assignment: Assignment) -> Assignment:
        """Vuelve a leer la asignación con sus relaciones (tras crearla o modificarla)."""
        self._session.expire(assignment)
        statement = _with_details(select(Assignment).where(Assignment.id == assignment.id))
        return self._session.scalars(statement.execution_options(populate_existing=True)).one()

    def search(
        self,
        teacher_id: int,
        *,
        is_active: bool | None,
        subject_id: int | None,
        career_code: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Assignment], int]:
        statement = select(Assignment).where(Assignment.teacher_id == teacher_id)
        if is_active is not None:
            statement = statement.where(Assignment.is_active.is_(is_active))
        if subject_id is not None:
            statement = statement.where(Assignment.subject_id == subject_id)
        if career_code is not None:
            statement = statement.where(
                Assignment.career_id.in_(select(Career.id).where(Career.code == career_code))
            )
        statement = _with_details(
            statement.order_by(Assignment.is_active.desc(), Assignment.created_at, Assignment.id)
        )
        return self._paginate(statement, offset=offset, limit=limit)

    def list_active(self, teacher_id: int) -> list[Assignment]:
        statement = select(Assignment).where(
            Assignment.teacher_id == teacher_id, Assignment.is_active
        )
        return list(self._session.scalars(_with_details(statement.order_by(Assignment.id))))

    def find_active_duplicate(
        self, teacher_id: int, subject_id: int, career_id: int, *, exclude_id: int | None = None
    ) -> Assignment | None:
        """RN-14: otra asignación activa con la misma materia y carrera."""
        condition = (
            (Assignment.teacher_id == teacher_id)
            & (Assignment.subject_id == subject_id)
            & (Assignment.career_id == career_id)
            & Assignment.is_active
        )
        if exclude_id is not None:
            condition &= Assignment.id != exclude_id
        return self._find_one(condition)

    def with_logbook(self, assignment_ids: Collection[int]) -> set[int]:
        """De las asignaciones dadas, las que tienen al menos una sesión en bitácora."""
        if not assignment_ids:
            return set()
        statement = select(Assignment.id).where(
            Assignment.id.in_(assignment_ids),
            exists().where(LogbookEntry.assignment_id == Assignment.id),
        )
        return set(self._session.scalars(statement))

    def delete_schedules(self, assignment_id: int) -> None:
        self._session.execute(delete(Schedule).where(Schedule.assignment_id == assignment_id))
