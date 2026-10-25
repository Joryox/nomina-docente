"""Constantes de negocio, del esquema y de la API. Son reglas del sistema, no configuración
del despliegue: cambiarlas cambia el comportamiento del sistema y, en el caso del esquema,
requiere una migración."""

from enum import IntEnum, StrEnum
from typing import Final

API_V1_PREFIX: Final = "/api/v1"

JWT_SECRET_MIN_LENGTH: Final = 32

REQUEST_ID_HEADER: Final = "X-Request-ID"

DATABASE_DRIVER: Final = "postgresql+psycopg"

CSRF_HEADER: Final = "X-CSRF-Token"

APP_PACKAGE_NAME: Final = "nomina-docente-backend"

TIMEZONE: Final = "America/Mexico_City"


# --- Calendario y periodos (RN-16, RN-24) ------------------------------------------------
class Weekday(IntEnum):
    """Día de la semana con numeración ISO 8601 (1 = lunes … 7 = domingo)."""

    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    SUNDAY = 7


class Fortnight(IntEnum):
    FIRST = 1
    SECOND = 2


FIRST_MONTH: Final = 1
LAST_MONTH: Final = 12

FIRST_FORTNIGHT_FIRST_DAY: Final = 1
FIRST_FORTNIGHT_LAST_DAY: Final = 15
SECOND_FORTNIGHT_FIRST_DAY: Final = FIRST_FORTNIGHT_LAST_DAY + 1

MINUTES_PER_HOUR: Final = 60


# --- Dinero y horas (RN-25, RN-26) -------------------------------------------------------
MONEY_DECIMAL_PLACES: Final = 2
HOURS_DECIMAL_PLACES: Final = 2
# Dígitos totales de NUMERIC(p, s). La tarifa cabe holgada en 10; los importes y totales
# usan 12 porque son productos y sumas de tarifas.
HOURLY_RATE_PRECISION: Final = 10
MONEY_AMOUNT_PRECISION: Final = 12
HOURS_PRECISION: Final = 8


# --- Folio del recibo (RN-30) ------------------------------------------------------------
FOLIO_NUMBER_DIGITS: Final = 6
FOLIO_TEMPLATE: Final = "{prefix}-{year:04d}{month:02d}-Q{fortnight}-{number:0{digits}d}"
FOLIO_MAX_LENGTH: Final = 40


# --- Longitudes de columnas --------------------------------------------------------------
EMAIL_MAX_LENGTH: Final = 254  # Límite práctico de una dirección (RFC 5321).
PASSWORD_HASH_MAX_LENGTH: Final = 255
PERSON_NAME_MAX_LENGTH: Final = 100
PERSON_FULL_NAME_MAX_LENGTH: Final = 3 * PERSON_NAME_MAX_LENGTH + 2
EMPLOYEE_NUMBER_MAX_LENGTH: Final = 20
CATALOG_CODE_MAX_LENGTH: Final = 20
CATALOG_NAME_MAX_LENGTH: Final = 150
CATALOG_DESCRIPTION_MAX_LENGTH: Final = 255
SUBJECT_NAME_MAX_LENGTH: Final = 150
SUBJECT_CODE_MAX_LENGTH: Final = 20
LOGBOOK_NOTES_MAX_LENGTH: Final = 500


# --- Catálogos ---------------------------------------------------------------------------
class RoleCode(StrEnum):
    """Códigos de rol que el código necesita conocer. El catálogo completo vive en la base."""

    TEACHER = "teacher"
    ADMIN = "admin"
