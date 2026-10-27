import uuid
from collections.abc import Collection

from sqlalchemy import case, func, select

from app.models.assignment import Assignment
from app.models.subject import Subject
from app.repositories.base import BaseRepository


class SubjectRepository(BaseRepository[Subject]):
    """Materias de un docente. Toda consulta recibe ``teacher_id`` (RN-04)."""

    model = Subject

    def get_for_teacher(self, teacher_id: int, public_id: uuid.UUID) -> Subject | None:
        return self._find_one((Subject.teacher_id == teacher_id) & (Subject.public_id == public_id))

    def get_by_name(self, teacher_id: int, name: str) -> Subject | None:
        """Busca con la misma normalización de la base (RN-09): sin acentos, mayúsculas ni
        espacios repetidos."""
        return self._find_one(
            (Subject.teacher_id == teacher_id)
            & (Subject.name_normalized == func.normalize_name(name))
        )

    def count_active(self, teacher_id: int) -> int:
        statement = select(func.count()).where(
            Subject.teacher_id == teacher_id, Subject.is_active.is_(True)
        )
        return int(self._session.scalar(statement) or 0)

    def search(
        self,
        teacher_id: int,
        *,
        term: str | None,
        is_active: bool | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Subject], int]:
        statement = select(Subject).where(Subject.teacher_id == teacher_id)
        if is_active is not None:
            statement = statement.where(Subject.is_active.is_(is_active))
        if term:
            # strpos sobre el nombre normalizado: no distingue mayúsculas ni acentos y no
            # interpreta % o _ como comodines.
            statement = statement.where(
                (func.strpos(Subject.name_normalized, func.normalize_name(term)) > 0)
                | (func.strpos(func.lower(func.coalesce(Subject.code, "")), func.lower(term)) > 0)
            )
        statement = statement.order_by(Subject.name_normalized, Subject.id)
        return self._paginate(statement, offset=offset, limit=limit)

    def assignment_counts(self, subject_ids: Collection[int]) -> dict[int, tuple[int, int]]:
        """``{subject_id: (asignaciones activas, asignaciones totales)}``."""
        if not subject_ids:
            return {}
        rows = self._session.execute(
            select(
                Assignment.subject_id,
                func.count(case((Assignment.is_active, 1))),
                func.count(),
            )
            .where(Assignment.subject_id.in_(subject_ids))
            .group_by(Assignment.subject_id)
        )
        return {subject_id: (active, total) for subject_id, active, total in rows}
