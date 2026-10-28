"""Contratos de la nómina quincenal: periodos, vista previa y recibos (RN-24 a RN-30)."""

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.core.codes import ErrorCode
from app.core.constants import Fortnight
from app.schemas.common import (
    Hours,
    Money,
    Month,
    Page,
    PeriodResponse,
    StrictInput,
    WarningItem,
    Year,
)


class PeriodStatus(StrEnum):
    FUTURE = "future"
    OPEN = "open"
    CLOSED = "closed"
    ISSUED = "issued"


class PeriodSummary(BaseModel):
    period: PeriodResponse
    status: PeriodStatus = Field(
        description="future: no empieza. open: en curso. closed: terminó sin recibo. "
        "issued: tiene recibo emitido."
    )
    receipt_id: uuid.UUID | None
    folio: str | None


class PeriodListResponse(BaseModel):
    year: int
    periods: list[PeriodSummary] = Field(description="Las 24 quincenas del año, en orden")


class PayrollLineResponse(BaseModel):
    assignment_id: uuid.UUID
    subject_name: str
    career_name: str
    group: str | None
    hourly_rate: Money
    session_count: int
    minutes: int
    hours: Hours
    amount: Money = Field(description="minutos × tarifa / 60, redondeado a centavos")


class PayrollPreviewResponse(BaseModel):
    period: PeriodResponse
    status: PeriodStatus
    receipt_id: uuid.UUID | None = Field(description="Recibo emitido del periodo, si existe")
    lines: list[PayrollLineResponse]
    session_count: int
    total_minutes: int
    total_hours: Hours
    total_amount: Money = Field(description="Total bruto: suma de los importes de los renglones")
    can_issue: bool
    issue_blockers: list[ErrorCode] = Field(
        description="Por qué no se puede emitir todavía (vacío si se puede)"
    )
    warnings: list[WarningItem]


class ReceiptCreate(StrictInput):
    year: Year
    month: Month
    fortnight: Fortnight

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"year": 2026, "month": 10, "fortnight": 1}]},
    )


class InstitutionResponse(BaseModel):
    name: str = Field(examples=["Tecnológico de Estudios Superiores de Huixquilucan"])
    short_name: str = Field(examples=["TESH"])


class ReceiptTeacher(BaseModel):
    full_name: str
    employee_number: str | None


class ReceiptLineResponse(BaseModel):
    assignment_id: uuid.UUID
    subject_name: str
    career_name: str
    group: str | None = Field(
        description="Grupo copiado al emitir; nulo en recibos emitidos sin grupo"
    )
    hourly_rate: Money
    minutes: int
    hours: Hours
    amount: Money


class ReceiptSummary(BaseModel):
    id: uuid.UUID
    folio: str = Field(examples=["NOM-202610-Q1-000042"])
    period: PeriodResponse
    issued_at: datetime
    total_hours: Hours
    total_amount: Money


class ReceiptDetailResponse(BaseModel):
    """Todo lo que necesita el recibo impreso y su PDF. Es una copia fija: no
    cambia aunque cambien los catálogos o el perfil del docente (RN-28)."""

    id: uuid.UUID
    folio: str
    institution: InstitutionResponse
    teacher: ReceiptTeacher
    period: PeriodResponse
    issued_at: datetime
    lines: list[ReceiptLineResponse]
    total_minutes: int
    total_hours: Hours
    total_amount: Money
    total_amount_words: str = Field(
        description="Total con letra, como en los documentos mexicanos",
        examples=["Mil doscientos cincuenta pesos 00/100 M.N."],
    )


class ReceiptPage(Page[ReceiptSummary]):
    pass
