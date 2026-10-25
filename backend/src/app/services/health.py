"""Estado de la API y de sus dependencias."""

import logging
from importlib.metadata import version

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import Settings
from app.core.constants import APP_PACKAGE_NAME
from app.repositories.health import HealthRepository
from app.schemas.health import DatabaseStatus, HealthResponse, ServiceStatus

logger = logging.getLogger(__name__)


class HealthService:
    def __init__(self, repository: HealthRepository, settings: Settings) -> None:
        self._repository = repository
        self._settings = settings

    def check(self) -> HealthResponse:
        database = self._check_database()
        return HealthResponse(
            status=ServiceStatus.OK if database is DatabaseStatus.OK else ServiceStatus.DEGRADED,
            database=database,
            version=version(APP_PACKAGE_NAME),
            environment=self._settings.app_env,
        )

    def _check_database(self) -> DatabaseStatus:
        try:
            self._repository.ping()
        except SQLAlchemyError as error:
            # Basta la causa resumida: la traza completa no aporta en una falla de conexión.
            cause = str(getattr(error, "orig", None) or error).strip().splitlines()[0]
            logger.warning("La base de datos no responde", extra={"cause": cause})
            return DatabaseStatus.UNAVAILABLE
        return DatabaseStatus.OK
