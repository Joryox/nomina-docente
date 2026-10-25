from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Sequence,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import (
    EMPLOYEE_NUMBER_MAX_LENGTH,
    FIRST_FORTNIGHT_FIRST_DAY,
    FIRST_FORTNIGHT_LAST_DAY,
    FIRST_MONTH,
    FOLIO_MAX_LENGTH,
    HOURS_DECIMAL_PLACES,
    HOURS_PRECISION,
    LAST_MONTH,
    MINUTES_PER_HOUR,
    MONEY_AMOUNT_PRECISION,
    MONEY_DECIMAL_PLACES,
    PERSON_FULL_NAME_MAX_LENGTH,
    SECOND_FORTNIGHT_FIRST_DAY,
    Fortnight,
)
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin, PublicIdMixin

if TYPE_CHECKING:
    from app.models.payroll_receipt_line import PayrollReceiptLine

# Consecutivo del folio (RN-30). Lo genera la base; el servicio lo pide antes de insertar
# para armar el folio con el prefijo configurado.
FOLIO_NUMBER_SEQUENCE = Sequence("payroll_receipts_folio_number_seq")

_FIRST = int(Fortnight.FIRST)
_SECOND = int(Fortnight.SECOND)

# RN-24: las fechas del periodo tienen que corresponder exactamente al año, mes y quincena.
_PERIOD_START_MATCHES = (
    "period_start = make_date(year, month, "
    f"CASE fortnight WHEN {_FIRST} THEN {FIRST_FORTNIGHT_FIRST_DAY} "
    f"ELSE {SECOND_FORTNIGHT_FIRST_DAY} END)"
)
_PERIOD_END_MATCHES = (
    "period_end = CASE fortnight "
    f"WHEN {_FIRST} THEN make_date(year, month, {FIRST_FORTNIGHT_LAST_DAY}) "
    f"ELSE (make_date(year, month, {FIRST_FORTNIGHT_FIRST_DAY}) "
    "+ interval '1 month' - interval '1 day')::date END"
)


class PayrollReceipt(IdentityPkMixin, PublicIdMixin, Base):
    """Recibo emitido: copia fija de la nómina de un periodo (RN-28).

    Guarda también el nombre y el número de empleado del docente tal como estaban al
    emitirlo. El trigger ``trg_payroll_receipts_immutable`` impide modificarlo o borrarlo.
    """

    __tablename__ = "payroll_receipts"
    __table_args__ = (
        UniqueConstraint("teacher_id", "year", "month", "fortnight"),  # RN-29
        UniqueConstraint("id", "teacher_id"),
        CheckConstraint(f"month BETWEEN {FIRST_MONTH} AND {LAST_MONTH}", name="month_range"),
        CheckConstraint(f"fortnight IN ({_FIRST}, {_SECOND})", name="fortnight_valid"),
        CheckConstraint(_PERIOD_START_MATCHES, name="period_start_matches"),
        CheckConstraint(_PERIOD_END_MATCHES, name="period_end_matches"),
        CheckConstraint("folio_number > 0", name="folio_number_positive"),
        CheckConstraint(trimmed_not_blank("folio"), name="folio_trimmed"),
        CheckConstraint(trimmed_not_blank("teacher_full_name"), name="teacher_full_name_trimmed"),
        CheckConstraint("total_minutes > 0", name="total_minutes_positive"),
        CheckConstraint("total_amount > 0", name="total_amount_positive"),
        {"comment": "Recibos de nómina emitidos: copia fija e inmutable."},
    )

    teacher_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="RESTRICT")
    )
    folio_number: Mapped[int] = mapped_column(
        BigInteger,
        FOLIO_NUMBER_SEQUENCE,
        server_default=FOLIO_NUMBER_SEQUENCE.next_value(),
        unique=True,
    )
    folio: Mapped[str] = mapped_column(String(FOLIO_MAX_LENGTH), unique=True)
    year: Mapped[int] = mapped_column(SmallInteger)
    month: Mapped[int] = mapped_column(SmallInteger)
    fortnight: Mapped[int] = mapped_column(SmallInteger)
    period_start: Mapped[date]
    period_end: Mapped[date]
    teacher_full_name: Mapped[str] = mapped_column(String(PERSON_FULL_NAME_MAX_LENGTH))
    teacher_employee_number: Mapped[str | None] = mapped_column(String(EMPLOYEE_NUMBER_MAX_LENGTH))
    total_minutes: Mapped[int] = mapped_column(Integer)
    total_hours: Mapped[Decimal] = mapped_column(
        Numeric(HOURS_PRECISION, HOURS_DECIMAL_PLACES),
        Computed(
            f"round(total_minutes::numeric / {MINUTES_PER_HOUR}, {HOURS_DECIMAL_PLACES})",
            persisted=True,
        ),
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(MONEY_AMOUNT_PRECISION, MONEY_DECIMAL_PLACES)
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lines: Mapped[list["PayrollReceiptLine"]] = relationship(
        viewonly=True, lazy="raise_on_sql", order_by="PayrollReceiptLine.id"
    )
