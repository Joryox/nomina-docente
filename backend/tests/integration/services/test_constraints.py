"""Cada restricción que los servicios traducen a un código de dominio existe en la base: si
alguien la renombra en una migración, esta prueba falla antes de que el docente vea un 500."""

import pytest
from sqlalchemy import Engine, text

from app.services.constraints import CONSTRAINT_ERRORS

pytestmark = pytest.mark.db


def test_translated_constraints_exist_in_the_schema(test_engine: Engine) -> None:
    with test_engine.connect() as connection:
        names = set(
            connection.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "UNION SELECT indexname FROM pg_indexes WHERE schemaname = 'public' "
                    "UNION SELECT tgname FROM pg_trigger WHERE NOT tgisinternal"
                )
            ).scalars()
        )

    assert sorted(set(CONSTRAINT_ERRORS) - names) == []
