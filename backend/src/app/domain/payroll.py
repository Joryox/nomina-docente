"""Cálculo del recibo de nómina a partir de la bitácora (RN-25, RN-26).

La vista previa y la emisión llaman a la **misma** función ``calculate_payroll`` con las
mismas sesiones; por eso los totales del recibo emitido coinciden exactamente con los de la
vista previa.

Un renglón agrupa las sesiones de una asignación **con la misma tarifa**: cada sesión
guarda la tarifa vigente cuando se registró, así que un cambio de tarifa a mitad de la
quincena produce dos renglones de la misma materia y carrera, cada uno con su tarifa.
"""

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from app.domain.money import amount_for, minutes_to_hours, sum_money
from app.domain.subjects import sort_key


@dataclass(frozen=True)
class SessionForPayroll:
    """Lo que el cálculo necesita de una sesión de bitácora."""

    assignment_key: int
    subject_name: str
    career_name: str
    group_code: str | None
    hourly_rate: Decimal
    minutes: int


@dataclass(frozen=True)
class PayrollLine:
    assignment_key: int
    subject_name: str
    career_name: str
    group_code: str | None
    hourly_rate: Decimal
    session_count: int
    minutes: int

    @property
    def hours(self) -> Decimal:
        return minutes_to_hours(self.minutes)

    @property
    def amount(self) -> Decimal:
        return amount_for(self.minutes, self.hourly_rate)


@dataclass(frozen=True)
class PayrollCalculation:
    lines: tuple[PayrollLine, ...]

    @property
    def session_count(self) -> int:
        return sum(line.session_count for line in self.lines)

    @property
    def total_minutes(self) -> int:
        return sum(line.minutes for line in self.lines)

    @property
    def total_hours(self) -> Decimal:
        return minutes_to_hours(self.total_minutes)

    @property
    def total_amount(self) -> Decimal:
        return sum_money([line.amount for line in self.lines])

    @property
    def is_empty(self) -> bool:
        return not self.lines


def calculate_payroll(sessions: list[SessionForPayroll]) -> PayrollCalculation:
    """Agrupa por (asignación, tarifa), suma minutos exactos y ordena por materia, carrera y
    grupo (sin grupo primero)."""
    groups: dict[tuple[int, Decimal], list[SessionForPayroll]] = defaultdict(list)
    for session in sessions:
        groups[(session.assignment_key, session.hourly_rate)].append(session)
    lines = [
        PayrollLine(
            assignment_key=key,
            subject_name=group[0].subject_name,
            career_name=group[0].career_name,
            group_code=group[0].group_code,
            hourly_rate=rate,
            session_count=len(group),
            minutes=sum(session.minutes for session in group),
        )
        for (key, rate), group in groups.items()
    ]
    lines.sort(
        key=lambda line: (
            sort_key(line.subject_name),
            sort_key(line.career_name),
            line.group_code is not None,
            line.group_code or "",
            line.hourly_rate,
        )
    )
    return PayrollCalculation(tuple(lines))
