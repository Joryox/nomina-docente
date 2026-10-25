"""Tipos y contratos compartidos por todos los recursos de la API.

- **Dinero y horas** viajan como cadenas decimales con dos decimales (``"1250.00"``), nunca
  como números JSON: un ``float`` no representa centavos con exactitud (RN-26).
- **Horas del día** en formato de 24 horas ``HH:MM`` (``"07:00"``), sin segundos.
- **Listados**: todos usan ``page`` (desde 1) y ``page_size`` (máximo ``MAX_PAGE_SIZE``) y
  responden con el mismo sobre ``{items, page, page_size, total_items, total_pages}``.
"""

import math
import re
import uuid
from dataclasses import dataclass
from datetime import date, time
from decimal import Decimal
from enum import StrEnum
from typing import Annotated, Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    PlainValidator,
    WithJsonSchema,
)

from app.core.codes import WarningCode
from app.core.constants import (
    CLOCK_TIME_FORMAT,
    CLOCK_TIME_PATTERN,
    DEFAULT_PAGE_SIZE,
    HOURS_DECIMAL_PLACES,
    MAX_PAGE_SIZE,
    MONEY_DECIMAL_PLACES,
    MONEY_INPUT_PATTERN,
    PERIOD_MAX_YEAR,
    PERIOD_MIN_YEAR,
    Fortnight,
)

_DECIMAL_OUTPUT_PATTERN = r"^-?\d+\.\d{2}$"
CLOCK_TIME_MESSAGE = "Escribe la hora en formato de 24 horas HH:MM, por ejemplo 07:00."
MONEY_MESSAGE = "Escribe el importe como texto con hasta dos decimales, por ejemplo «135.00»."


def _format_decimal(places: int) -> Any:
    return lambda value: f"{value:.{places}f}"


def _parse_clock_time(value: Any) -> time:
    if isinstance(value, time) and value.second == 0 and value.microsecond == 0:
        return value.replace(tzinfo=None)
    if not isinstance(value, str) or not re.fullmatch(CLOCK_TIME_PATTERN, value):
        raise ValueError(CLOCK_TIME_MESSAGE)
    return time.fromisoformat(value)


def _parse_money(value: Any) -> Decimal:
    # JSON nunca produce Decimal: esta rama solo la usa el código que construye el modelo
    # directamente (p. ej. los datos de demostración). Un número JSON siempre se rechaza.
    if isinstance(value, Decimal):
        value = f"{value:f}"
    if not isinstance(value, str) or not re.fullmatch(MONEY_INPUT_PATTERN, value):
        raise ValueError(MONEY_MESSAGE)
    return Decimal(value)


Money = Annotated[
    Decimal,
    PlainSerializer(_format_decimal(MONEY_DECIMAL_PLACES), return_type=str, when_used="json"),
    WithJsonSchema({"type": "string", "pattern": _DECIMAL_OUTPUT_PATTERN, "examples": ["1250.00"]}),
]
Hours = Annotated[
    Decimal,
    PlainSerializer(_format_decimal(HOURS_DECIMAL_PLACES), return_type=str, when_used="json"),
    WithJsonSchema({"type": "string", "pattern": _DECIMAL_OUTPUT_PATTERN, "examples": ["12.50"]}),
]
MoneyInput = Annotated[
    Decimal,
    PlainValidator(_parse_money),
    WithJsonSchema({"type": "string", "pattern": MONEY_INPUT_PATTERN, "examples": ["135.00"]}),
]
ClockTime = Annotated[
    time,
    PlainValidator(_parse_clock_time),
    PlainSerializer(lambda value: value.strftime(CLOCK_TIME_FORMAT), return_type=str),
    WithJsonSchema({"type": "string", "pattern": CLOCK_TIME_PATTERN, "examples": ["07:00"]}),
]
Year = Annotated[int, Field(ge=PERIOD_MIN_YEAR, le=PERIOD_MAX_YEAR, examples=[2026])]
Month = Annotated[int, Field(ge=1, le=12, examples=[10])]


class StrictInput(BaseModel):
    """Base de toda entrada: rechaza campos desconocidos (p. ej. ``teacher_id``)."""

    model_config = ConfigDict(extra="forbid")


class StatusFilter(StrEnum):
    """Filtro de baja lógica de los listados (materias y asignaciones)."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ALL = "all"

    @property
    def is_active(self) -> bool | None:
        return None if self is StatusFilter.ALL else self is StatusFilter.ACTIVE


@dataclass(frozen=True)
class PageParams:
    page: int = 1
    page_size: int = DEFAULT_PAGE_SIZE

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Page[ItemT](BaseModel):
    items: list[ItemT]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=MAX_PAGE_SIZE)
    total_items: int = Field(ge=0)
    total_pages: int = Field(ge=0)

    @classmethod
    def build(cls, items: list[ItemT], params: PageParams, total_items: int, **extra: Any) -> Any:
        """Arma la página; ``extra`` recibe campos propios de un listado (p. ej. totales)."""
        return cls(
            items=items,
            page=params.page,
            page_size=params.page_size,
            total_items=total_items,
            total_pages=math.ceil(total_items / params.page_size),
            **extra,
        )


class WarningItem(BaseModel):
    """Aviso que no impide la operación, con código estable para el frontend."""

    code: WarningCode
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class PeriodResponse(BaseModel):
    year: int
    month: int
    fortnight: Fortnight = Field(description="1: días 1 al 15. 2: día 16 al último del mes.")
    start_date: date
    end_date: date
    is_current: bool = Field(description="La fecha de hoy cae en esta quincena")
    is_finished: bool = Field(description="La quincena ya terminó")


class AssignmentSummary(BaseModel):
    """Lo mínimo para mostrar una asignación dentro de otro recurso."""

    id: uuid.UUID
    subject_name: str
    career_code: str
    career_name: str
    is_active: bool
