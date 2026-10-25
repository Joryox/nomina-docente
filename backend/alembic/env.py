"""Entorno de Alembic: URL desde Settings y metadatos de todos los modelos registrados.

Las pruebas pasan su propia conexión en ``config.attributes["connection"]`` para migrar la
base de pruebas sin tocar la de desarrollo.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection, create_engine

import app.models
from app.core.config import get_settings

config = context.config

if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = app.models.Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().database_url.render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _run_with_connection(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if isinstance(connection, Connection):
        _run_with_connection(connection)
        return
    engine = create_engine(get_settings().database_url)
    with engine.connect() as new_connection:
        _run_with_connection(new_connection)
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
