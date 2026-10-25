"""Clases programadas contra sesiones registradas (RN-20, RN-21).

- Una **ocurrencia** es un horario semanal en una fecha concreta (p. ej. el horario de los
  lunes de Bases de Datos el lunes 19 de octubre).
- Está **registrada** si existe una sesión de la misma asignación en esa fecha cuyo
  intervalo se cruza con el del horario (la sesión pudo empezar o terminar unos minutos
  distinta).
- Está **vencida** (se puede y se debe registrar) si su hora de salida ya pasó.
- Una sesión **coincide con el horario** si su asignación tiene ese día un horario con
  exactamente la misma entrada y salida.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, time
from enum import StrEnum

from app.domain.time_ranges import TimeRange


@dataclass(frozen=True)
class ScheduledSlot:
    slot_key: int
    assignment_key: int
    weekday: int
    time_range: TimeRange


@dataclass(frozen=True)
class RecordedSession:
    entry_key: int
    assignment_key: int
    day: date
    time_range: TimeRange


@dataclass(frozen=True)
class ClassOccurrence:
    slot: ScheduledSlot
    day: date
    session: RecordedSession | None

    @property
    def registered(self) -> bool:
        return self.session is not None


def is_due(day: date, end: time, today: date, now: time) -> bool:
    """La clase ya terminó: su fecha pasó, o es hoy y ya pasó la hora de salida."""
    return day < today or (day == today and end <= now)


def occurrences(
    slots: Iterable[ScheduledSlot], sessions: Iterable[RecordedSession], days: Iterable[date]
) -> list[ClassOccurrence]:
    """Ocurrencias de los horarios en ``days``, ordenadas por fecha y hora de entrada."""
    by_weekday: dict[int, list[ScheduledSlot]] = {}
    for slot in slots:
        by_weekday.setdefault(slot.weekday, []).append(slot)
    by_day: dict[date, list[RecordedSession]] = {}
    for session in sessions:
        by_day.setdefault(session.day, []).append(session)

    result: list[ClassOccurrence] = []
    for day in days:
        day_sessions = by_day.get(day, [])
        for slot in sorted(by_weekday.get(day.isoweekday(), []), key=lambda s: s.time_range.start):
            match = next(
                (
                    session
                    for session in day_sessions
                    if session.assignment_key == slot.assignment_key
                    and session.time_range.overlaps(slot.time_range)
                ),
                None,
            )
            result.append(ClassOccurrence(slot, day, match))
    return result


class ScheduleMatch(StrEnum):
    EXACT = "exact"
    DIFFERENT_TIMES = "different_times"
    NOT_SCHEDULED = "not_scheduled"


def schedule_match(
    assignment_key: int, day: date, time_range: TimeRange, slots: Iterable[ScheduledSlot]
) -> ScheduleMatch:
    same_day = [
        slot
        for slot in slots
        if slot.assignment_key == assignment_key and slot.weekday == day.isoweekday()
    ]
    if not same_day:
        return ScheduleMatch.NOT_SCHEDULED
    if any(slot.time_range == time_range for slot in same_day):
        return ScheduleMatch.EXACT
    return ScheduleMatch.DIFFERENT_TIMES
