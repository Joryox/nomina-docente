"""Composición de dependencias: arma servicios con sus repositorios para los routers.

Es el único punto de la capa API que conoce sesiones y repositorios; los routers solo
reciben servicios ya construidos.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.repositories.health import HealthRepository
from app.services.health import HealthService

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_health_service(session: DbSession, settings: AppSettings) -> HealthService:
    return HealthService(HealthRepository(session), settings)
