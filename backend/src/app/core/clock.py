"""Reloj inyectable: los servicios reciben la hora actual en lugar de leerla por su cuenta,
así las pruebas pueden simular el paso del tiempo (bloqueos, expiraciones)."""

from collections.abc import Callable
from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

from app.core.constants import TIMEZONE

type Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


class BusinessCalendar:
    """Fecha y hora de la institución (``TIMEZONE``) para las reglas de negocio.

    Se inyecta aparte del reloj de sesión: PyJWT valida la expiración de los tokens con la
    hora real del sistema, así que las pruebas fijan el calendario del negocio (por ejemplo,
    «hoy es 16 de octubre») sin invalidar las cookies de sesión.
    """

    def __init__(self, clock: Clock, timezone: str = TIMEZONE) -> None:
        self._clock = clock
        self._zone = ZoneInfo(timezone)

    def now(self) -> datetime:
        return self._clock().astimezone(self._zone)

    def today(self) -> date:
        return self.now().date()

    def current_time(self) -> time:
        """Hora local sin segundos, comparable con las horas de horarios y sesiones."""
        return self.now().time().replace(second=0, microsecond=0)
