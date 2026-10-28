"""Construcción de respuestas a partir de entidades. Nunca se devuelve un modelo ORM."""

from datetime import date

from app.core.constants import Fortnight, Weekday
from app.domain.periods import Period
from app.domain.time_ranges import TimeRange
from app.models.assignment import Assignment
from app.models.career import Career
from app.models.hourly_rate import HourlyRate
from app.models.payroll_receipt import PayrollReceipt
from app.models.schedule import Schedule
from app.schemas.catalogs import CareerResponse, CareerTypeResponse, HourlyRateResponse
from app.schemas.common import AssignmentSummary, PeriodResponse
from app.schemas.payroll import ReceiptSummary
from app.schemas.schedules import ScheduleResponse


def period_response(period: Period, today: date) -> PeriodResponse:
    return PeriodResponse(
        year=period.year,
        month=period.month,
        fortnight=period.fortnight,
        start_date=period.start,
        end_date=period.end,
        is_current=period.contains(today),
        is_finished=period.is_finished(today),
    )


def career_response(career: Career) -> CareerResponse:
    return CareerResponse(
        code=career.code,
        name=career.name,
        career_type=CareerTypeResponse(code=career.career_type.code, name=career.career_type.name),
        is_active=career.is_active,
    )


def rate_response(rate: HourlyRate) -> HourlyRateResponse:
    return HourlyRateResponse(amount=rate.amount, is_active=rate.is_active)


def assignment_summary(assignment: Assignment) -> AssignmentSummary:
    return AssignmentSummary(
        id=assignment.public_id,
        subject_name=assignment.subject.name,
        career_code=assignment.career.code,
        career_name=assignment.career.name,
        group=assignment.group_code,
        is_active=assignment.is_active,
    )


def describe_class(assignment: Assignment) -> str:
    """«Bases de Datos (Ingeniería en Sistemas Computacionales, grupo 3101)» para mensajes."""
    group = f", grupo {assignment.group_code}" if assignment.group_code else ""
    return f"{assignment.subject.name} ({assignment.career.name}{group})"


def class_details(assignment: Assignment) -> dict[str, str | None]:
    """Datos de una clase dentro de ``details`` de un error o una advertencia."""
    return {
        "assignment_id": str(assignment.public_id),
        "subject_name": assignment.subject.name,
        "career_code": assignment.career.code,
        "career_name": assignment.career.name,
        "group": assignment.group_code,
    }


def schedule_range(schedule: Schedule) -> TimeRange:
    return TimeRange(schedule.start_time, schedule.end_time)


def schedule_response(schedule: Schedule, assignment: Assignment) -> ScheduleResponse:
    return ScheduleResponse(
        id=schedule.public_id,
        assignment_id=assignment.public_id,
        weekday=Weekday(schedule.weekday),
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        duration_minutes=schedule_range(schedule).minutes,
    )


def receipt_period(receipt: PayrollReceipt) -> Period:
    return Period(receipt.year, receipt.month, Fortnight(receipt.fortnight))


def receipt_summary(receipt: PayrollReceipt, today: date) -> ReceiptSummary:
    return ReceiptSummary(
        id=receipt.public_id,
        folio=receipt.folio,
        period=period_response(receipt_period(receipt), today),
        issued_at=receipt.issued_at,
        total_hours=receipt.total_hours,
        total_amount=receipt.total_amount,
    )
