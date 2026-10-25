"""Periodos quincenales de nómina (RN-24).

- Quincena 1: del día ``FIRST_FORTNIGHT_FIRST_DAY`` al ``FIRST_FORTNIGHT_LAST_DAY``.
- Quincena 2: del día ``SECOND_FORTNIGHT_FIRST_DAY`` al último día del mes (28, 29, 30 o 31;
  ``calendar.monthrange`` resuelve meses cortos y años bisiestos).
"""

import calendar
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Self

from app.core.constants import (
    FIRST_FORTNIGHT_FIRST_DAY,
    FIRST_FORTNIGHT_LAST_DAY,
    FIRST_MONTH,
    FORTNIGHT_ORDINALS,
    LAST_MONTH,
    MONTH_NAMES,
    PERIOD_MAX_YEAR,
    PERIOD_MIN_YEAR,
    SECOND_FORTNIGHT_FIRST_DAY,
    Fortnight,
)


def long_date(day: date) -> str:
    """Fecha larga en español (CLAUDE.md §7.4): «15 de octubre de 2026»."""
    return f"{day.day} de {MONTH_NAMES[day.month]} de {day.year}"


def last_day_of_month(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


@dataclass(frozen=True, order=True)
class Period:
    """Quincena identificada por año, mes y número. El orden es cronológico."""

    year: int
    month: int
    fortnight: Fortnight

    def __post_init__(self) -> None:
        if not PERIOD_MIN_YEAR <= self.year <= PERIOD_MAX_YEAR:
            raise ValueError(f"El año debe estar entre {PERIOD_MIN_YEAR} y {PERIOD_MAX_YEAR}.")
        if not FIRST_MONTH <= self.month <= LAST_MONTH:
            raise ValueError(f"El mes debe estar entre {FIRST_MONTH} y {LAST_MONTH}.")
        # Acepta el número (1 o 2) y lo guarda como enumeración.
        object.__setattr__(self, "fortnight", Fortnight(self.fortnight))

    @classmethod
    def containing(cls, day: date) -> Self:
        """Quincena a la que pertenece una fecha."""
        fortnight = Fortnight.FIRST if day.day <= FIRST_FORTNIGHT_LAST_DAY else Fortnight.SECOND
        return cls(day.year, day.month, fortnight)

    @property
    def start(self) -> date:
        if self.fortnight is Fortnight.FIRST:
            return date(self.year, self.month, FIRST_FORTNIGHT_FIRST_DAY)
        return date(self.year, self.month, SECOND_FORTNIGHT_FIRST_DAY)

    @property
    def end(self) -> date:
        if self.fortnight is Fortnight.FIRST:
            return date(self.year, self.month, FIRST_FORTNIGHT_LAST_DAY)
        return date(self.year, self.month, last_day_of_month(self.year, self.month))

    @property
    def day_count(self) -> int:
        return (self.end - self.start).days + 1

    def contains(self, day: date) -> bool:
        return self.start <= day <= self.end

    def days(self) -> Iterator[date]:
        current = self.start
        while current <= self.end:
            yield current
            current += timedelta(days=1)

    def next(self) -> "Period":
        return Period.containing(self.end + timedelta(days=1))

    def previous(self) -> "Period":
        return Period.containing(self.start - timedelta(days=1))

    def is_future(self, today: date) -> bool:
        return self.start > today

    def is_finished(self, today: date) -> bool:
        return self.end < today

    def label(self) -> str:
        """Nombre para documentos y mensajes: «2.ª quincena de octubre de 2026»."""
        month = MONTH_NAMES[self.month]
        return f"{FORTNIGHT_ORDINALS[self.fortnight]} quincena de {month} de {self.year}"

    def range_label(self) -> str:
        """Días del periodo: «16 al 31 de octubre»."""
        return f"{self.start.day} al {self.end.day} de {MONTH_NAMES[self.month]}"


def periods_of_year(year: int) -> list[Period]:
    """Las 24 quincenas de un año, en orden."""
    return [
        Period(year, month, fortnight)
        for month in range(FIRST_MONTH, LAST_MONTH + 1)
        for fortnight in Fortnight
    ]
