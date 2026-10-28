"""Catálogos de solo lectura para los selectores (RN-05, RN-06, RN-10, RN-11).

Los catálogos no exponen su ``id`` interno: se identifican por su llave natural, estable e
inmutable (``code`` en carreras, ``amount`` en tarifas), que es lo que la API recibe al
crear una asignación.
"""

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import ClockTime, Money, Page


class CareerTypeResponse(BaseModel):
    code: str = Field(examples=["engineering"])
    name: str = Field(examples=["Ingeniería"])


class CareerResponse(BaseModel):
    code: str = Field(examples=["ISC"])
    name: str = Field(examples=["Ingeniería en Sistemas Computacionales"])
    career_type: CareerTypeResponse
    is_active: bool


class HourlyRateResponse(BaseModel):
    amount: Money = Field(description="Tarifa por hora en MXN")
    is_active: bool


class CareerPage(Page[CareerResponse]):
    pass


class HourlyRatePage(Page[HourlyRateResponse]):
    pass


class BusinessRulesResponse(BaseModel):
    """Reglas configurables que el frontend necesita para validar antes de enviar, sin
    duplicarlas (igual que la política de contraseñas)."""

    timezone: str = Field(examples=["America/Mexico_City"])
    today: date = Field(description="Fecha actual en la zona horaria de la institución")
    class_min_duration_minutes: int
    class_max_duration_minutes: int
    logbook_max_age_days: int = Field(
        description="Antigüedad máxima, en días, de una sesión que se registra"
    )
    payroll_issue_requires_closed_period: bool = Field(
        description="Si es verdadero, solo se emite el recibo de una quincena ya terminada"
    )
    afternoon_shift_start: ClockTime = Field(
        description="Desde esta hora de entrada la clase es vespertina; antes, matutina"
    )
    group_code_max_length: int
    schedule_batch_max_ranges: int = Field(
        description="Rangos de horas en una captura de horarios de varios días"
    )
    max_page_size: int
    quick_logbook_max_entries: int
