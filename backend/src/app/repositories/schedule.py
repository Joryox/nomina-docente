import uuid
from datetime import time

from sqlalchemy import Select, select
from sqlalchemy.orm import selectinload

from app.models.assignment import Assignment
from app.models.schedule import Schedule
from app.repositories.base import BaseRepository


def _with_assignment(statement: Select[Schedule]) -> Select[Schedule]:
    return statement.options(
        selectinload(Schedule.assignment).selectinload(Assignment.subject),
        selectinload(Schedule.assignment).selectinload(Assignment.career),
    )


class ScheduleRepository(BaseRepository[Schedule]):
    """Horarios semanales de un docente (RN-04, RN-16)."""

    model = Schedule

    def get_for_teacher(self, teacher_id: int, public_id: uuid.UUID) -> Schedule | None:
        statement = select(Schedule).where(
            Schedule.teacher_id == teacher_id, Schedule.public_id == public_id
        )
        return self._session.scalars(_with_assignment(statement)).one_or_none()

    def find_overlapping(
        self,
        teacher_id: int,
        weekday: int,
        start: time,
        end: time,
        *,
        exclude_id: int | None = None,
    ) -> list[Schedule]:
        """RN-18: horarios del docente, de cualquier asignación, que se cruzan con
        ``[start, end)`` el mismo día de la semana."""
        statement = select(Schedule).where(
            Schedule.teacher_id == teacher_id,
            Schedule.weekday == weekday,
            Schedule.start_time < end,
            Schedule.end_time > start,
        )
        if exclude_id is not None:
            statement = statement.where(Schedule.id != exclude_id)
        return list(
            self._session.scalars(_with_assignment(statement.order_by(Schedule.start_time)))
        )

    def list_active(self, teacher_id: int, *, weekday: int | None = None) -> list[Schedule]:
        """Horarios de las asignaciones activas, ordenados por día y hora."""
        statement = (
            select(Schedule)
            .join(Assignment, Assignment.id == Schedule.assignment_id)
            .where(Schedule.teacher_id == teacher_id, Assignment.is_active)
        )
        if weekday is not None:
            statement = statement.where(Schedule.weekday == weekday)
        statement = statement.order_by(Schedule.weekday, Schedule.start_time)
        return list(self._session.scalars(_with_assignment(statement)))
