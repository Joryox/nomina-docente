from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import (
    CATALOG_NAME_MAX_LENGTH,
    HOURLY_RATE_PRECISION,
    HOURS_DECIMAL_PLACES,
    HOURS_PRECISION,
    MINUTES_PER_HOUR,
    MONEY_AMOUNT_PRECISION,
    MONEY_DECIMAL_PLACES,
    SUBJECT_NAME_MAX_LENGTH,
)
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin


class PayrollReceiptLine(IdentityPkMixin, Base):
    """Renglón congelado del recibo: una asignación con sus minutos, tarifa e importe."""

    __tablename__ = "payroll_receipt_lines"
    __table_args__ = (
        # Las dos llaves compuestas obligan a que recibo y asignación sean del mismo docente.
        ForeignKeyConstraint(
            ["receipt_id", "teacher_id"],
            ["payroll_receipts.id", "payroll_receipts.teacher_id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["assignment_id", "teacher_id"],
            ["assignments.id", "assignments.teacher_id"],
            ondelete="RESTRICT",
        ),
        # Un renglón por asignación y tarifa: si la tarifa cambió dentro de la quincena, la
        # misma asignación aparece en dos renglones, cada uno con su tarifa.
        UniqueConstraint("receipt_id", "assignment_id", "hourly_rate"),
        Index("ix_payroll_receipt_lines_assignment_id_teacher_id", "assignment_id", "teacher_id"),
        Index("ix_payroll_receipt_lines_receipt_id_teacher_id", "receipt_id", "teacher_id"),
        CheckConstraint(trimmed_not_blank("subject_name"), name="subject_name_trimmed"),
        CheckConstraint(trimmed_not_blank("career_name"), name="career_name_trimmed"),
        CheckConstraint("minutes > 0", name="minutes_positive"),
        CheckConstraint("hourly_rate > 0", name="hourly_rate_positive"),
        # RN-25 y RN-26: importe = minutos * tarifa / 60, redondeado a 2 decimales. round()
        # de NUMERIC redondea la mitad hacia arriba (lejos de cero), igual que ROUND_HALF_UP.
        CheckConstraint(
            f"amount = round(minutes * hourly_rate / {MINUTES_PER_HOUR}, {MONEY_DECIMAL_PLACES})",
            name="amount_matches_rate",
        ),
        {"comment": "Renglones congelados de cada recibo emitido."},
    )

    receipt_id: Mapped[int] = mapped_column(BigInteger)
    teacher_id: Mapped[int] = mapped_column(BigInteger)
    assignment_id: Mapped[int] = mapped_column(BigInteger)
    subject_name: Mapped[str] = mapped_column(String(SUBJECT_NAME_MAX_LENGTH))
    career_name: Mapped[str] = mapped_column(String(CATALOG_NAME_MAX_LENGTH))
    minutes: Mapped[int] = mapped_column(Integer)
    hours: Mapped[Decimal] = mapped_column(
        Numeric(HOURS_PRECISION, HOURS_DECIMAL_PLACES),
        Computed(
            f"round(minutes::numeric / {MINUTES_PER_HOUR}, {HOURS_DECIMAL_PLACES})",
            persisted=True,
        ),
    )
    hourly_rate: Mapped[Decimal] = mapped_column(
        Numeric(HOURLY_RATE_PRECISION, MONEY_DECIMAL_PLACES)
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(MONEY_AMOUNT_PRECISION, MONEY_DECIMAL_PLACES))
