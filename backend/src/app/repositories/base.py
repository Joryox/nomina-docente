"""Repositorio base genérico: operaciones comunes de acceso a datos, sin reglas de negocio.

Los repositorios no confirman transacciones: ``add`` hace ``flush`` para que la base asigne
los valores por defecto (``id``, ``public_id``, marcas de tiempo) y para que una violación
de restricción aparezca en la operación que la causó. El ``commit`` lo decide el servicio.
"""

from sqlalchemy import ColumnElement, select
from sqlalchemy.orm import Session

from app.db.base import Base


class BaseRepository[ModelT: Base]:
    model: type[ModelT]

    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, entity_id: int) -> ModelT | None:
        return self._session.get(self.model, entity_id)

    def add(self, entity: ModelT) -> ModelT:
        self._session.add(entity)
        self._session.flush()
        return entity

    def _find_one(self, condition: ColumnElement[bool]) -> ModelT | None:
        return self._session.scalars(select(self.model).where(condition)).one_or_none()
