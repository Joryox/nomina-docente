import uuid
from dataclasses import dataclass
from datetime import date, time

from sqlalchemy import ColumnElement, Integer, Select, cast, func, select
from sqlalchemy.orm import selectinload

from app.models.assignment import Assignment
from app.models.logbook_entry import LogbookEntry
from app.repositories.base import BaseRepository

SECONDS_PER_MINUTE = 60


@dataclass(frozen=True)
class LogbookFilter:
    teacher_id: int
    date_from: date | None = None
    date_to: date | None = None
    assignment_id: int | None = None

    def conditions(self) -> list[ColumnElement[bool]]:
        conditions = [LogbookEntry.teacher_id == self.teacher_id]
        if self.date_from is not None:
            conditions.append(LogbookEntry.session_date >= self.date_from)
        if self.date_to is not None:
            conditions.append(LogbookEntry.session_date <= self.date_to)
        if self.assignment_id is not None:
            conditions.append(LogbookEntry.assignment_id == self.assignment_id)
        return conditions


def _with_details(statement: Select[LogbookEntry]) -> Select[LogbookEntry]:
    return statement.options(
        selectinload(LogbookEntry.assignment).selectinload(Assignment.subject),
        selectinload(LogbookEntry.assignment).selectinload(Assignment.career),
        selectinload(LogbookEntry.hourly_rate),
    )


# Minutos de una sesión calculados en la base: (salida - entrada) en segundos / 60.
_SESSION_MINUTES = cast(
    func.extract("epoch", LogbookEntry.end_time - LogbookEntry.start_time) / SECONDS_PER_MINUTE,
    Integer,
)


class LogbookRepository(BaseRepository[LogbookEntry]):
    """Sesiones de bitácora de un docente (RN-04, RN-19)."""

    model = LogbookEntry

    def get_for_teacher(self, teacher_id: int, public_id: uuid.UUID) -> LogbookEntry | None:
        statement = select(LogbookEntry).where(
            LogbookEntry.teacher_id == teacher_id, LogbookEntry.public_id == public_id
        )
        return self._session.scalars(_with_details(statement)).one_or_none()

    def reload(self, entry: LogbookEntry) -> LogbookEntry:
        statement = _with_details(select(LogbookEntry).where(LogbookEntry.id == entry.id))
        return self._session.scalars(statement.execution_options(populate_existing=True)).one()

    def search(
        self, criteria: LogbookFilter, *, offset: int, limit: int
    ) -> tuple[list[LogbookEntry], int]:
        statement = _with_details(
            select(LogbookEntry)
            .where(*criteria.conditions())
            .order_by(
                LogbookEntry.session_date.desc(), LogbookEntry.start_time.desc(), LogbookEntry.id
            )
        )
        return self._paginate(statement, offset=offset, limit=limit)

    def totals(self, criteria: LogbookFilter) -> tuple[int, int]:
        """(número de sesiones, minutos totales) de todo el filtro."""
        count, minutes = self._session.execute(
            select(func.count(), func.coalesce(func.sum(_SESSION_MINUTES), 0)).where(
                *criteria.conditions()
            )
        ).one()
        return int(count), int(minutes)

    def in_range(self, teacher_id: int, start: date, end: date) -> list[LogbookEntry]:
        statement = _with_details(
            select(LogbookEntry)
            .where(
                LogbookEntry.teacher_id == teacher_id,
                LogbookEntry.session_date.between(start, end),
            )
            .order_by(LogbookEntry.session_date, LogbookEntry.start_time)
        )
        return list(self._session.scalars(statement))

    def find_overlapping(
        self,
        teacher_id: int,
        session_date: date,
        start: time,
        end: time,
        *,
        exclude_id: int | None = None,
    ) -> list[LogbookEntry]:
        """RN-22: sesiones del docente ese día que se cruzan con ``[start, end)``."""
        statement = select(LogbookEntry).where(
            LogbookEntry.teacher_id == teacher_id,
            LogbookEntry.session_date == session_date,
            LogbookEntry.start_time < end,
            LogbookEntry.end_time > start,
        )
        if exclude_id is not None:
            statement = statement.where(LogbookEntry.id != exclude_id)
        return list(self._session.scalars(_with_details(statement)))
