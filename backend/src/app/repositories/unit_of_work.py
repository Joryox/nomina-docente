"""Unidad de trabajo: el servicio decide cuándo se confirma o se revierte la transacción
sin conocer la sesión de SQLAlchemy (docs/arquitectura.md)."""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.orm import Session


class UnitOfWork:
    def __init__(self, session: Session) -> None:
        self._session = session

    @contextmanager
    def transaction(self) -> Iterator[None]:
        """Confirma al salir del bloque; ante cualquier excepción, revierte todo."""
        try:
            yield
            self._session.commit()
        except BaseException:
            self._session.rollback()
            raise
