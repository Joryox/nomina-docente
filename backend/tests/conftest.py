"""Fixtures compartidas.

Las pruebas marcadas con ``@pytest.mark.db`` usan la base ``DB_NAME_TEST``. Si no hay
conexión, se saltan con un mensaje que explica cómo prepararla, en lugar de fallar.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.main import create_app

DB_UNAVAILABLE_HINT = (
    "No hay conexión a la base de pruebas {database} ({reason}). "
    "Revisa DB_PASSWORD en backend/.env y ejecuta scripts/create-databases.sh."
)


@pytest.fixture
def valid_settings_values() -> dict[str, Any]:
    """Valores completos y válidos para construir Settings sin leer el entorno."""
    return {
        "app_env": "test",
        "app_name": "Sistema de Nómina Docente",
        "api_host": "127.0.0.1",
        "api_port": 8000,
        "log_level": "INFO",
        "institution_name": "Tecnológico de Estudios Superiores de Huixquilucan",
        "institution_short_name": "TESH",
        "db_host": "localhost",
        "db_port": 5432,
        "db_user": "postgres",
        "db_password": "contraseña-de-prueba",
        "db_name": "nomina_docente",
        "db_name_test": "nomina_docente_test",
        "jwt_secret": "x" * 48,
        "jwt_algorithm": "HS256",
        "access_token_expire_minutes": 480,
        "auth_cookie_name": "nomina_session",
        "csrf_cookie_name": "nomina_csrf",
        "auth_cookie_secure": False,
        "cors_origins": "http://localhost:3000",
        "payroll_folio_prefix": "NOM",
    }


@pytest.fixture(scope="session")
def settings() -> Settings:
    return get_settings()


@pytest.fixture(scope="session")
def test_engine(settings: Settings) -> Iterator[Engine]:
    engine = create_engine(settings.test_database_url, pool_pre_ping=True)
    try:
        with engine.connect():
            pass
    except OperationalError as error:
        engine.dispose()
        reason = str(error.orig).strip().splitlines()[0] if error.orig else "sin detalle"
        pytest.skip(DB_UNAVAILABLE_HINT.format(database=settings.db_name_test, reason=reason))
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(test_engine: Engine) -> Iterator[Session]:
    """Sesión dentro de una transacción que se revierte al terminar cada prueba."""
    with test_engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
            yield session
        transaction.rollback()


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_client(app: FastAPI, db_session: Session) -> Iterator[TestClient]:
    """Cliente cuya dependencia ``get_db`` apunta a la base de pruebas."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
