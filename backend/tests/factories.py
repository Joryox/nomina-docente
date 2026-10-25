"""Fábricas de datos de prueba. Insertan con ``flush`` y nunca confirman la transacción."""

import calendar
import itertools
from datetime import date, time
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.constants import (
    FIRST_FORTNIGHT_FIRST_DAY,
    FIRST_FORTNIGHT_LAST_DAY,
    SECOND_FORTNIGHT_FIRST_DAY,
    Fortnight,
    Weekday,
)
from app.db.base import Base
from app.models import (
    Assignment,
    Career,
    HourlyRate,
    LogbookEntry,
    PayrollReceipt,
    PayrollReceiptLine,
    Schedule,
    Subject,
    Teacher,
    User,
)

_sequence = itertools.count(1)


def _persist[ModelT: Base](session: Session, entity: ModelT) -> ModelT:
    session.add(entity)
    session.flush()
    return entity


def create_user(session: Session, email: str | None = None) -> User:
    email = email or f"docente{next(_sequence)}@tesh.edu.mx"
    return _persist(session, User(email=email, password_hash="hash-de-prueba"))


def create_teacher(session: Session, employee_number: str | None = None) -> Teacher:
    teacher = Teacher(
        user_id=create_user(session).id,
        first_names="Ana María",
        paternal_surname="García",
        maternal_surname="López",
        employee_number=employee_number,
    )
    return _persist(session, teacher)


def create_subject(session: Session, teacher: Teacher, name: str | None = None) -> Subject:
    name = name or f"Materia {next(_sequence)}"
    return _persist(session, Subject(teacher_id=teacher.id, name=name))


def create_assignment(
    session: Session,
    teacher: Teacher,
    career: Career,
    hourly_rate: HourlyRate,
    subject: Subject | None = None,
) -> Assignment:
    subject = subject or create_subject(session, teacher)
    assignment = Assignment(
        teacher_id=teacher.id,
        subject_id=subject.id,
        career_id=career.id,
        hourly_rate_id=hourly_rate.id,
    )
    return _persist(session, assignment)


def build_schedule(assignment: Assignment, weekday: Weekday, start: time, end: time) -> Schedule:
    return Schedule(
        assignment_id=assignment.id,
        teacher_id=assignment.teacher_id,
        weekday=weekday,
        start_time=start,
        end_time=end,
    )


def build_logbook_entry(
    assignment: Assignment, session_date: date, start: time, end: time
) -> LogbookEntry:
    return LogbookEntry(
        assignment_id=assignment.id,
        teacher_id=assignment.teacher_id,
        session_date=session_date,
        start_time=start,
        end_time=end,
        hourly_rate_id=assignment.hourly_rate_id,
    )


def period_bounds(year: int, month: int, fortnight: Fortnight) -> tuple[date, date]:
    if fortnight is Fortnight.FIRST:
        return (
            date(year, month, FIRST_FORTNIGHT_FIRST_DAY),
            date(year, month, FIRST_FORTNIGHT_LAST_DAY),
        )
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, SECOND_FORTNIGHT_FIRST_DAY), date(year, month, last_day)


def build_receipt(teacher: Teacher, year: int, month: int, fortnight: Fortnight) -> PayrollReceipt:
    """``folio_number`` lo asigna la secuencia de la base al insertar."""
    period_start, period_end = period_bounds(year, month, fortnight)
    return PayrollReceipt(
        teacher_id=teacher.id,
        folio=f"PRUEBA-{year}{month:02d}-Q{int(fortnight)}-{next(_sequence):06d}",
        year=year,
        month=month,
        fortnight=fortnight,
        period_start=period_start,
        period_end=period_end,
        teacher_full_name="Ana María García López",
        total_minutes=60,
        total_amount=Decimal("125.00"),
    )


def build_receipt_line(
    receipt: PayrollReceipt, assignment: Assignment, minutes: int, rate: Decimal, amount: Decimal
) -> PayrollReceiptLine:
    return PayrollReceiptLine(
        receipt_id=receipt.id,
        teacher_id=receipt.teacher_id,
        assignment_id=assignment.id,
        subject_name="Bases de Datos",
        career_name="Ingeniería en Sistemas Computacionales",
        minutes=minutes,
        hourly_rate=rate,
        amount=amount,
    )
