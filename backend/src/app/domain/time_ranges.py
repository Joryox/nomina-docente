"""Intervalos de horas de clase (RN-17, RN-18).

Un intervalo es semiabierto ``[entrada, salida)``: incluye la entrada y excluye la salida.
Así, una clase de 10:00 a 12:00 y otra de 12:00 a 14:00 **no** se empalman (la misma
semántica que ``timerange(start_time, end_time, '[)')`` en la base). Ninguna clase cruza la
medianoche: la salida siempre es posterior a la entrada del mismo día.
"""

from dataclasses import dataclass
from datetime import time
from enum import StrEnum

from app.core.constants import CLOCK_TIME_FORMAT, MINUTES_PER_HOUR


def minutes_of_day(value: time) -> int:
    return value.hour * MINUTES_PER_HOUR + value.minute


@dataclass(frozen=True)
class TimeRange:
    start: time
    end: time

    @property
    def minutes(self) -> int:
        return minutes_of_day(self.end) - minutes_of_day(self.start)

    def overlaps(self, other: "TimeRange") -> bool:
        return self.start < other.end and other.start < self.end

    def label(self) -> str:
        """«10:00–12:00» (24 horas, CLAUDE.md §7.4)."""
        return f"{self.start.strftime(CLOCK_TIME_FORMAT)}–{self.end.strftime(CLOCK_TIME_FORMAT)}"


class DurationProblem(StrEnum):
    END_NOT_AFTER_START = "end_not_after_start"
    TOO_SHORT = "too_short"
    TOO_LONG = "too_long"


def duration_problem(
    time_range: TimeRange, min_minutes: int, max_minutes: int
) -> DurationProblem | None:
    """Revisa RN-17 y los límites de duración configurados; ``None`` si todo está bien."""
    if time_range.end <= time_range.start:
        return DurationProblem.END_NOT_AFTER_START
    if time_range.minutes < min_minutes:
        return DurationProblem.TOO_SHORT
    if time_range.minutes > max_minutes:
        return DurationProblem.TOO_LONG
    return None
