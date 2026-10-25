"""Constantes de negocio y de la API. Son reglas del sistema, no configuración del despliegue."""

from typing import Final

API_V1_PREFIX: Final = "/api/v1"

JWT_SECRET_MIN_LENGTH: Final = 32

REQUEST_ID_HEADER: Final = "X-Request-ID"

DATABASE_DRIVER: Final = "postgresql+psycopg"

CSRF_HEADER: Final = "X-CSRF-Token"

APP_PACKAGE_NAME: Final = "nomina-docente-backend"
