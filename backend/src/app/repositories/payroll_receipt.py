import uuid
from datetime import date

from sqlalchemy import exists, select
from sqlalchemy.orm import selectinload

from app.models.payroll_receipt import FOLIO_NUMBER_SEQUENCE, PayrollReceipt
from app.models.payroll_receipt_line import PayrollReceiptLine
from app.repositories.base import BaseRepository


class PayrollReceiptRepository(BaseRepository[PayrollReceipt]):
    """Recibos emitidos de un docente (RN-04, RN-28). Solo se insertan: nunca se modifican
    ni se borran (lo garantizan los triggers de la base)."""

    model = PayrollReceipt

    def get_for_teacher(self, teacher_id: int, public_id: uuid.UUID) -> PayrollReceipt | None:
        statement = (
            select(PayrollReceipt)
            .where(PayrollReceipt.teacher_id == teacher_id, PayrollReceipt.public_id == public_id)
            .options(selectinload(PayrollReceipt.lines).selectinload(PayrollReceiptLine.assignment))
        )
        return self._session.scalars(statement).one_or_none()

    def get_for_period(
        self, teacher_id: int, year: int, month: int, fortnight: int
    ) -> PayrollReceipt | None:
        return self._find_one(
            (PayrollReceipt.teacher_id == teacher_id)
            & (PayrollReceipt.year == year)
            & (PayrollReceipt.month == month)
            & (PayrollReceipt.fortnight == fortnight)
        )

    def issued_between(self, teacher_id: int, start: date, end: date) -> list[PayrollReceipt]:
        """Recibos cuyos periodos se cruzan con ``[start, end]``."""
        statement = select(PayrollReceipt).where(
            PayrollReceipt.teacher_id == teacher_id,
            PayrollReceipt.period_start <= end,
            PayrollReceipt.period_end >= start,
        )
        return list(self._session.scalars(statement))

    def is_locked(self, teacher_id: int, day: date) -> bool:
        """RN-23: la fecha cae en un periodo con recibo emitido."""
        statement = select(
            exists().where(
                PayrollReceipt.teacher_id == teacher_id,
                PayrollReceipt.period_start <= day,
                PayrollReceipt.period_end >= day,
            )
        )
        return bool(self._session.scalar(statement))

    def search(
        self, teacher_id: int, *, year: int | None, offset: int, limit: int
    ) -> tuple[list[PayrollReceipt], int]:
        statement = select(PayrollReceipt).where(PayrollReceipt.teacher_id == teacher_id)
        if year is not None:
            statement = statement.where(PayrollReceipt.year == year)
        statement = statement.order_by(PayrollReceipt.period_start.desc())
        return self._paginate(statement, offset=offset, limit=limit)

    def next_folio_number(self) -> int:
        """Siguiente consecutivo de la secuencia de la base (RN-30). ``nextval`` es seguro
        ante peticiones simultáneas: dos transacciones nunca reciben el mismo número."""
        number = self._session.scalar(select(FOLIO_NUMBER_SEQUENCE.next_value()))
        if number is None:
            raise RuntimeError("La secuencia del folio no devolvió un valor.")
        return int(number)

    def add_lines(self, lines: list[PayrollReceiptLine]) -> None:
        self._session.add_all(lines)
        self.flush()

    def latest(self, teacher_id: int, limit: int) -> list[PayrollReceipt]:
        statement = (
            select(PayrollReceipt)
            .where(PayrollReceipt.teacher_id == teacher_id)
            .order_by(PayrollReceipt.period_start.desc())
            .limit(limit)
        )
        return list(self._session.scalars(statement))

    def reload(self, receipt: PayrollReceipt) -> PayrollReceipt:
        statement = (
            select(PayrollReceipt)
            .where(PayrollReceipt.id == receipt.id)
            .options(selectinload(PayrollReceipt.lines).selectinload(PayrollReceiptLine.assignment))
            .execution_options(populate_existing=True)
        )
        return self._session.scalars(statement).one()
