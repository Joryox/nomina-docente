"""El esquema que crea la migración coincide con los modelos y se puede revertir completo."""

from collections.abc import Iterator

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Connection, Engine, inspect, text

import app.models
from tests.helpers import run_alembic

pytestmark = pytest.mark.db

EXPECTED_TABLES = {
    "alembic_version",
    "assignments",
    "career_types",
    "careers",
    "hourly_rates",
    "logbook_entries",
    "payroll_receipt_lines",
    "payroll_receipts",
    "roles",
    "schedules",
    "subjects",
    "teachers",
    "user_roles",
    "users",
}

# Prefijo esperado por tipo de restricción (pg_constraint.contype). Los NOT NULL ('n') los
# nombra PostgreSQL y no forman parte de la convención.
CONSTRAINT_PREFIXES = {"p": "pk_", "f": "fk_", "u": "uq_", "c": "ck_", "x": "ex_"}
INDEX_PREFIXES = ("pk_", "uq_", "ix_", "ex_")


@pytest.fixture
def connection(test_engine: Engine) -> Iterator[Connection]:
    with test_engine.connect() as connection:
        yield connection


def _scalars(connection: Connection, sql: str) -> set[str]:
    return set(connection.execute(text(sql)).scalars())


def test_models_match_the_migration(connection: Connection) -> None:
    """Autogenerate no encuentra diferencias: modelos y migración describen el mismo esquema."""
    context = MigrationContext.configure(connection, opts={"compare_type": True})

    assert compare_metadata(context, app.models.Base.metadata) == []


def test_extensions_live_in_their_own_schema(connection: Connection) -> None:
    rows = connection.execute(
        text(
            "SELECT e.extname, n.nspname FROM pg_extension AS e "
            "JOIN pg_namespace AS n ON n.oid = e.extnamespace "
            "WHERE e.extname IN ('btree_gist', 'unaccent')"
        )
    ).all()

    assert sorted(tuple(row) for row in rows) == [
        ("btree_gist", "extensions"),
        ("unaccent", "extensions"),
    ]


def test_constraint_names_follow_the_convention(connection: Connection) -> None:
    rows = connection.execute(
        text(
            "SELECT c.conname, c.contype FROM pg_constraint AS c "
            "JOIN pg_namespace AS n ON n.oid = c.connamespace "
            "WHERE n.nspname = 'public' AND c.contype <> 'n' "
            "AND c.conrelid NOT IN (0, 'alembic_version'::regclass)"
        )
    ).all()

    misnamed = [name for name, kind in rows if not name.startswith(CONSTRAINT_PREFIXES[kind])]
    assert rows
    assert misnamed == []


def test_index_names_follow_the_convention(connection: Connection) -> None:
    names = _scalars(
        connection,
        "SELECT indexname FROM pg_indexes "
        "WHERE schemaname = 'public' AND tablename <> 'alembic_version'",
    )

    assert sorted(name for name in names if not name.startswith(INDEX_PREFIXES)) == []


def test_every_foreign_key_is_indexed(connection: Connection) -> None:
    """Cada llave foránea tiene un índice que empieza con sus columnas (borrados y joins)."""
    unindexed = _scalars(
        connection,
        """
        SELECT c.conname FROM pg_constraint AS c
        JOIN pg_namespace AS n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND c.contype = 'f'
          AND NOT EXISTS (
              SELECT 1 FROM pg_index AS i
              WHERE i.indrelid = c.conrelid
                AND (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey
          )
        """,
    )

    assert sorted(unindexed) == []


def test_downgrade_and_upgrade_cycle(test_engine: Engine) -> None:
    """upgrade head → downgrade base → upgrade head, sin dejar objetos huérfanos."""
    try:
        run_alembic(test_engine, command.downgrade, "base")
        with test_engine.connect() as connection:
            assert set(inspect(connection).get_table_names()) == {"alembic_version"}
            leftovers = _scalars(
                connection,
                "SELECT typname FROM pg_type WHERE typname = 'timerange' "
                "UNION ALL SELECT proname FROM pg_proc "
                "WHERE proname IN ('normalize_name', 'fn_set_updated_at', 'fn_reject_change') "
                "UNION ALL SELECT nspname FROM pg_namespace WHERE nspname = 'extensions'",
            )
            assert leftovers == set()
    finally:
        run_alembic(test_engine, command.upgrade, "head")

    with test_engine.connect() as connection:
        assert set(inspect(connection).get_table_names()) == EXPECTED_TABLES
