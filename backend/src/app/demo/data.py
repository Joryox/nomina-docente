"""Datos **ficticios** de la cuenta de demostración. Ninguno corresponde a una persona real.

El correo usa el dominio reservado ``example.com`` (RFC 2606) para que nunca coincida con
una cuenta institucional.
"""

from dataclasses import dataclass
from datetime import time
from decimal import Decimal
from typing import Final

from app.core.constants import Weekday

DEMO_EMAIL: Final = "docente.demo@example.com"
DEMO_PASSWORD: Final = "Pizarron-Verde-2026"
DEMO_FIRST_NAMES: Final = "Docente"
DEMO_PATERNAL_SURNAME: Final = "Demostración"
DEMO_MATERNAL_SURNAME: Final = "Ficticia"
DEMO_EMPLOYEE_NUMBER: Final = "DEMO-0001"

# Quincenas anteriores a la actual que se llenan de bitácora. Se emiten todas menos la más
# reciente, que queda «cerrada sin recibo» para mostrar la emisión en vivo.
HISTORY_PERIODS: Final = 3

# Cada cuántas clases programadas se omite una (queda «pendiente de registrar») y cada
# cuántas se registra con horas distintas al horario (advertencia «fuera de horario»).
SKIP_EVERY: Final = 11
ADJUST_EVERY: Final = 7
ADJUST_MINUTES: Final = 10

# Hora local a la que «se registra» cada sesión pasada: después de cualquier clase del día.
REGISTRATION_HOUR: Final = 22
# Hora local a la que se emite el recibo, el día siguiente al fin de la quincena.
ISSUE_HOUR: Final = 9


@dataclass(frozen=True)
class DemoSlot:
    weekday: Weekday
    start: time
    end: time


@dataclass(frozen=True)
class DemoAssignment:
    subject: str
    subject_code: str | None
    career_code: str
    hourly_rate: Decimal
    slots: tuple[DemoSlot, ...]
    # Tarifa a la que cambia después de la primera quincena emitida (muestra que el cambio
    # no altera las sesiones ya registradas).
    new_rate: Decimal | None = None


def _slot(weekday: Weekday, start: str, end: str) -> DemoSlot:
    return DemoSlot(weekday, time.fromisoformat(start), time.fromisoformat(end))


ASSIGNMENTS: Final = (
    DemoAssignment(
        "Bases de Datos",
        "SCD-1004",
        "ISC",
        Decimal("135.00"),
        (_slot(Weekday.MONDAY, "07:00", "09:00"), _slot(Weekday.WEDNESDAY, "07:00", "09:00")),
    ),
    DemoAssignment(
        "Programación Orientada a Objetos",
        "SCD-1020",
        "ISC",
        Decimal("125.00"),
        (_slot(Weekday.TUESDAY, "07:00", "09:00"), _slot(Weekday.THURSDAY, "07:00", "09:00")),
        new_rate=Decimal("135.00"),
    ),
    DemoAssignment(
        "Bases de Datos",
        "SCD-1004",
        "IIND",
        Decimal("125.00"),
        (_slot(Weekday.MONDAY, "11:00", "13:00"),),
    ),
    DemoAssignment(
        "Investigación de Operaciones",
        "AED-1035",
        "IIND",
        Decimal("135.00"),
        (_slot(Weekday.TUESDAY, "10:00", "12:00"), _slot(Weekday.FRIDAY, "08:00", "10:00")),
    ),
    DemoAssignment(
        "Administración de Proyectos",
        None,
        "LADM",
        Decimal("145.00"),
        (_slot(Weekday.WEDNESDAY, "16:00", "18:00"), _slot(Weekday.THURSDAY, "16:00", "17:30")),
    ),
    DemoAssignment(
        "Taller de Ética",
        "ACA-0907",
        "LADM",
        Decimal("125.00"),
        (_slot(Weekday.MONDAY, "16:00", "16:50"),),
    ),
    DemoAssignment(
        "Cálculo Diferencial",
        "ACF-0901",
        "IMEC",
        Decimal("125.00"),
        (_slot(Weekday.FRIDAY, "11:00", "12:40"),),
    ),
)
