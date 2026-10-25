"""Repositorio base genérico: operaciones comunes de acceso a datos, sin reglas de negocio.

Los repositorios no confirman transacciones: ``add`` hace ``flush`` para que la base asigne
los valores por defecto (``id``, ``public_id``, marcas de tiempo) y para que una violación
de restricción aparezca en la operación que la causó, como ``ConstraintViolationError``.
El ``commit`` lo decide el servicio.
"""

import psycopg
from sqlalchemy import ColumnElement, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.base import Base
from app.repositories.errors import ConstraintViolationError


class BaseRepository[ModelT: Base]:
    model: type[ModelT]

    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, entity_id: int) -> ModelT | None:
        return self._session.get(self.model, entity_id)

    def add(self, entity: ModelT) -> ModelT:
        self._session.add(entity)
        self.flush()
        return entity

    def flush(self) -> None:
        try:
            self._session.flush()
        except IntegrityError as error:
            original = error.orig
            constraint = (
                original.diag.constraint_name if isinstance(original, psycopg.Error) else None
            )
            raise ConstraintViolationError(constraint) from error

    def _find_one(
        self, condition: ColumnElement[bool], *, for_update: bool = False
    ) -> ModelT | None:
        statement = select(self.model).where(condition)
        if for_update:
            statement = statement.with_for_update()
        return self._session.scalars(statement).one_or_none()
