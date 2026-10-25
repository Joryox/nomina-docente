"""Utilidades compartidas por las pruebas de integración."""

from collections.abc import Callable, Iterator
from contextlib import contextmanager

import psycopg
import pytest
from alembic.config import Config
from sqlalchemy import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import BACKEND_DIR

ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


def run_alembic(engine: Engine, command: Callable[[Config, str], None], revision: str) -> None:
    """Ejecuta un comando de Alembic (``upgrade``, ``downgrade``) sobre ``engine``."""
    config = Config(ALEMBIC_INI)
    config.attributes["configure_logger"] = False
    with engine.begin() as connection:
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
