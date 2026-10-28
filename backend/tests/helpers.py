"""Utilidades compartidas por las pruebas de integración."""

from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from alembic.config import Config
from sqlalchemy import Connection, Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import BACKEND_DIR

ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


def run_alembic(engine: Engine, command: Callable[[Config, str], None], revision: str) -> None:
    """Ejecuta un comando de Alembic (``upgrade``, ``downgrade``) sobre ``engine``."""
    with engine.begin() as connection:
        run_alembic_on(connection, command, revision)


def run_alembic_on(
    connection: Connection, command: Callable[[Config, str], None], revision: str
) -> None:
    """Igual que ``run_alembic``, dentro de la transacción de ``connection`` (que la prueba
    puede revertir al terminar)."""
    config = Config(ALEMBIC_INI)
    config.attributes["configure_logger"] = False
    config.attributes["connection"] = connection
    command(config, revision)


@contextmanager
def violates(session: Session, constraint: str) -> Iterator[None]:
    """Exige que el bloque viole ``constraint`` en la base (no en Python).

    El bloque corre en un SAVEPOINT: tras el error, la sesión sigue usable en la prueba.
    """
    with pytest.raises(IntegrityError) as caught, session.begin_nested():
        yield
        session.flush()
    error = caught.value.orig
    assert isinstance(error, psycopg.Error)
    assert error.diag.constraint_name == constraint


class FakeClock:
    """Reloj controlable: empieza en la hora real y avanza solo cuando la prueba lo pide."""

    def __init__(self, start: datetime | None = None) -> None:
        self.now = start or datetime.now(UTC)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, delta: timedelta) -> None:
        self.now += delta
