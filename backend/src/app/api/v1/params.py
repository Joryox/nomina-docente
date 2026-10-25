"""Parámetros de consulta compartidos por varias rutas."""

from typing import Annotated

from fastapi import Depends, Query

from app.core.codes import ErrorCode
from app.core.constants import PERIOD_MAX_YEAR, PERIOD_MIN_YEAR, Fortnight
from app.core.exceptions import domain_error
from app.domain.periods import Period

YearQuery = Annotated[
    int, Query(ge=PERIOD_MIN_YEAR, le=PERIOD_MAX_YEAR, description="Año", examples=[2026])
]
MonthQuery = Annotated[int, Query(ge=1, le=12, description="Mes (1 a 12)", examples=[10])]
FortnightQuery = Annotated[
    Fortnight, Query(description="Quincena: 1 (días 1 al 15) o 2 (del 16 al fin de mes)")
]


def get_period(year: YearQuery, month: MonthQuery, fortnight: FortnightQuery) -> Period:
    return Period(year, month, fortnight)


def get_optional_period(
    year: YearQuery | None = None,
    month: MonthQuery | None = None,
    fortnight: FortnightQuery | None = None,
) -> Period | None:
    """Filtro opcional por quincena: se envían los tres datos o ninguno."""
    values = (year, month, fortnight)
    if all(value is None for value in values):
        return None
    if year is None or month is None or fortnight is None:
        raise domain_error(
            ErrorCode.VALIDATION_ERROR,
            "Para filtrar por quincena envía el año, el mes y la quincena.",
            details={"fields": [{"location": ["query", "year", "month", "fortnight"]}]},
        )
    return Period(year, month, fortnight)


PeriodParams = Annotated[Period, Depends(get_period)]
OptionalPeriodParams = Annotated[Period | None, Depends(get_optional_period)]
