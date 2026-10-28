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
MINUTES_PER_DAY: Final = 24 * MINUTES_PER_HOUR

# Años que acepta la API para un periodo de nómina: evita errores de captura (p. ej. 20026).
PERIOD_MIN_YEAR: Final = 2000
PERIOD_MAX_YEAR: Final = 2100

# Textos del calendario en español para mensajes y documentos del backend (el frontend tiene
# los suyos en src/constants/). El índice 0 queda vacío para indexar por número ISO o de mes.
WEEKDAY_NAMES: Final = (
    "",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
)
MONTH_NAMES: Final = (
    "",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)
FORTNIGHT_ORDINALS: Final = ("", "1.ª", "2.ª")


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


# --- Materias (RN-08, RN-09) ---------------------------------------------------------------
# Palabras que se escriben en minúsculas dentro del nombre de una materia (salvo al inicio):
# «Fundamentos de Investigación», «Taller de Ética y Valores».
SUBJECT_NAME_LOWERCASE_WORDS: Final = frozenset(
    {
        "a",
        "al",
        "con",
        "de",
        "del",
        "e",
        "el",
        "en",
        "la",
        "las",
        "lo",
        "los",
        "o",
        "para",
        "por",
        "sin",
        "u",
        "un",
        "una",
        "y",
    }
)
# Números romanos que se escriben en mayúsculas: «Cálculo II», «Taller de Investigación I».
SUBJECT_NAME_ROMAN_NUMERALS: Final = frozenset(
    {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}
)
SUBJECT_CODE_PATTERN: Final = r"^[A-Za-z0-9][A-Za-z0-9\-]*$"


# --- Listados y paginación (docs/api.md) -------------------------------------------------
DEFAULT_PAGE_SIZE: Final = 20
MAX_PAGE_SIZE: Final = 100
SEARCH_TERM_MAX_LENGTH: Final = 100

# Máximo de clases en un registro rápido de bitácora: más que las de un día completo.
QUICK_LOGBOOK_MAX_ENTRIES: Final = 20
# Detalle máximo de advertencias con lista (clases sin registrar, sesiones fuera de horario).
WARNING_DETAIL_MAX_ITEMS: Final = 50
DASHBOARD_LATEST_RECEIPTS: Final = 3

# Formato de horas en la API: 24 horas con dos dígitos, sin segundos (docs/sistema-de-diseno.md §8).
CLOCK_TIME_PATTERN: Final = r"^([01]\d|2[0-3]):[0-5]\d$"
CLOCK_TIME_FORMAT: Final = "%H:%M"
# Montos que recibe la API: cadena decimal con hasta dos decimales, nunca un número JSON.
MONEY_INPUT_PATTERN: Final = r"^\d{1,8}(\.\d{1,2})?$"


# --- Catálogos ---------------------------------------------------------------------------
class RoleCode(StrEnum):
    """Códigos de rol que el código necesita conocer. El catálogo completo vive en la base."""

    TEACHER = "teacher"
    ADMIN = "admin"


# --- Autenticación y sesión (docs/seguridad.md) ----------------------------------------
AUTH_ROUTE_PREFIX: Final = "/auth"
# La cookie de refresh solo viaja a las rutas de autenticación (path restringido).
REFRESH_COOKIE_PATH: Final = f"{API_V1_PREFIX}{AUTH_ROUTE_PREFIX}"
SESSION_COOKIE_PATH: Final = "/"

JWT_ISSUER: Final = "nomina-docente"
JWT_AUDIENCE: Final = "nomina-docente-api"
ACCESS_TOKEN_TYPE: Final = "access"
# Bytes aleatorios del refresh token y del token CSRF (256 bits): no se pueden adivinar.
OPAQUE_TOKEN_BYTES: Final = 32
TOKEN_HASH_HEX_LENGTH: Final = 64  # SHA-256 en hexadecimal.
SESSION_HINT_COOKIE_VALUE: Final = "1"

# Argon2 acepta cualquier longitud; el máximo evita gastar CPU con entradas enormes.
PASSWORD_MAX_LENGTH: Final = 128
# Partes del correo o del nombre más cortas que esto no se buscan dentro de la contraseña
# (evita rechazar «Ana2026…» solo porque contiene «an»).
PASSWORD_PERSONAL_DATA_MIN_LENGTH: Final = 3

USER_AGENT_MAX_LENGTH: Final = 255
SESSION_REVOCATION_REASON_MAX_LENGTH: Final = 30
# Huella del correo en los registros de seguridad: identifica intentos repetidos sin
# escribir el correo en claro.
EMAIL_FINGERPRINT_LENGTH: Final = 16

# Nombres de personas: letras (cualquier alfabeto), espacios simples, apóstrofo, guion y punto.
PERSON_NAME_PATTERN: Final = r"^\p{L}+(?:[ '.\-]\p{L}+)*\.?$"
EMPLOYEE_NUMBER_PATTERN: Final = r"^[A-Za-z0-9][A-Za-z0-9\-]*$"


class SessionRevocationReason(StrEnum):
    LOGOUT = "logout"
    LOGOUT_ALL = "logout_all"
    PASSWORD_CHANGED = "password_changed"
    REFRESH_TOKEN_REUSED = "refresh_token_reused"


# --- Endurecimiento HTTP -----------------------------------------------------------------
SAFE_HTTP_METHODS: Final = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
DOCS_PATHS: Final = ("/docs", "/redoc", f"{API_V1_PREFIX}/openapi.json")


# --- Recibo en PDF (RN-27) ----------------------------------------------------------------
# Tamaño carta en milímetros y márgenes del documento.
RECEIPT_PDF_FORMAT: Final = "Letter"
RECEIPT_PDF_MARGIN_MM: Final = 18
# Colores en sRGB: el azul marino de la marca (brand-800) y los neutros fríos de la interfaz.
# El primario lo reemplaza scripts/apply-brand.sh (documents/brand/brand.json).
RECEIPT_PDF_BRAND_RGB: Final = (24, 56, 110)
RECEIPT_PDF_INK_RGB: Final = (30, 36, 48)
RECEIPT_PDF_MUTED_RGB: Final = (88, 96, 112)
RECEIPT_PDF_LINE_RGB: Final = (206, 212, 222)
RECEIPT_PDF_SUNKEN_RGB: Final = (241, 243, 247)
RECEIPT_PDF_MEDIA_TYPE: Final = "application/pdf"
