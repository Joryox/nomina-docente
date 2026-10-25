"""Límites institucionales configurables que aplican los servicios (sección 9.4 de CLAUDE.md).

Los servicios reciben este objeto en lugar de ``Settings``: solo conocen las reglas que
usan, y las pruebas pueden construir una política distinta sin tocar el entorno.
"""

from dataclasses import dataclass
from typing import Self

from app.core.config import Settings


@dataclass(frozen=True)
class BusinessPolicy:
    class_min_duration_minutes: int
    class_max_duration_minutes: int
    logbook_max_age_days: int
    payroll_issue_requires_closed_period: bool

    @classmethod
    def from_settings(cls, settings: Settings) -> Self:
        return cls(
            class_min_duration_minutes=settings.class_min_duration_minutes,
            class_max_duration_minutes=settings.class_max_duration_minutes,
            logbook_max_age_days=settings.logbook_max_age_days,
            payroll_issue_requires_closed_period=settings.payroll_issue_requires_closed_period,
        )
