"""Reloj inyectable: los servicios reciben la hora actual en lugar de leerla por su cuenta,
así las pruebas pueden simular el paso del tiempo (bloqueos, expiraciones)."""

from collections.abc import Callable
from datetime import UTC, datetime

type Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)
