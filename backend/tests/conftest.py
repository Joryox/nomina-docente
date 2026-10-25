"""Fixtures compartidas.

Las pruebas marcadas con ``@pytest.mark.db`` usan la base ``DB_NAME_TEST``, migrada a la
última versión al iniciar la sesión de pruebas. Cada prueba corre dentro de una transacción
que se revierte al terminar. Si no hay conexión, las pruebas se saltan con un mensaje que
explica cómo preparar la base, en lugar de fallar.
"""

from collections.abc import Callable, Iterator
from decimal import Decimal
from typing import Any

import pytest
from alembic import command
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_clock
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.main import create_app
from app.models import Career, HourlyRate
from app.repositories.career import CareerRepository
from app.repositories.hourly_rate import HourlyRateRepository
from app.seeds.runner import run_seeds
from tests.helpers import FakeClock, run_alembic

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
        "access_token_expire_minutes": 15,
        "refresh_token_expire_days": 7,
        "refresh_token_reuse_grace_seconds": 10,
        "access_cookie_name": "nomina_access",
        "refresh_cookie_name": "nomina_refresh",
        "session_hint_cookie_name": "nomina_session",
        "csrf_cookie_name": "nomina_csrf",
        "auth_cookie_secure": False,
        "auth_cookie_samesite": "lax",
        "login_max_failed_attempts": 5,
        "login_lockout_minutes": 15,
        "password_min_length": 12,
        "max_request_body_bytes": 65536,
        "cors_origins": "http://localhost:3000",
        "payroll_folio_prefix": "NOM",
        "payroll_issue_requires_closed_period": True,
        "class_min_duration_minutes": 30,
        "class_max_duration_minutes": 300,
        "logbook_max_age_days": 30,
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
    run_alembic(engine, command.upgrade, "head")
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
def seeded_session(db_session: Session) -> Session:
    """Sesión de pruebas con los catálogos semilla cargados (dentro de la transacción)."""
    run_seeds(db_session)
    return db_session


@pytest.fixture
def career(seeded_session: Session) -> Career:
    career = CareerRepository(seeded_session).get_by_code("ISC")
    assert career is not None
    return career


@pytest.fixture
def other_career(seeded_session: Session) -> Career:
    career = CareerRepository(seeded_session).get_by_code("LADM")
    assert career is not None
    return career


@pytest.fixture
def hourly_rate(seeded_session: Session) -> HourlyRate:
    rate = HourlyRateRepository(seeded_session).get_by_amount(Decimal("125.00"))
    assert rate is not None
    return rate


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


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def auth_app(
    app: FastAPI, db_session: Session, clock: FakeClock, seeded_session: Session
) -> FastAPI:
    """Aplicación contra la base de pruebas (con catálogos) y con el reloj simulado."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_clock] = lambda: clock
    return app


@pytest.fixture
def make_client(auth_app: FastAPI) -> Iterator[Callable[[], TestClient]]:
    """Fábrica de clientes: cada uno es un navegador distinto con sus propias cookies."""
    clients: list[TestClient] = []

    def factory() -> TestClient:
        client = TestClient(auth_app)
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.close()
    auth_app.dependency_overrides.clear()


@pytest.fixture
def browser(make_client: Callable[[], TestClient]) -> TestClient:
    return make_client()
