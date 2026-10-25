from datetime import date
from decimal import ROUND_HALF_UP, Decimal

import pytest
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.constants import MINUTES_PER_HOUR, MONEY_DECIMAL_PLACES, Fortnight
from app.models import Assignment, Career, HourlyRate, PayrollReceipt, Teacher
from tests.factories import (
    build_receipt,
    build_receipt_line,
    create_assignment,
    create_teacher,
)
from tests.helpers import violates

pytestmark = pytest.mark.db

CENT = Decimal(1).scaleb(-MONEY_DECIMAL_PLACES)


@pytest.fixture
def teacher(seeded_session: Session) -> Teacher:
    return create_teacher(seeded_session)


@pytest.fixture
def receipt(seeded_session: Session, teacher: Teacher) -> PayrollReceipt:
    receipt = build_receipt(teacher, 2026, 10, Fortnight.SECOND)
    seeded_session.add(receipt)
    seeded_session.flush()
    seeded_session.refresh(receipt)
    return receipt


@pytest.fixture
def assignment(
    seeded_session: Session, teacher: Teacher, career: Career, hourly_rate: HourlyRate
) -> Assignment:
    return create_assignment(seeded_session, teacher, career, hourly_rate)


class TestReceipt:
    def test_one_receipt_per_teacher_and_period(
        self, seeded_session: Session, receipt: PayrollReceipt, teacher: Teacher
    ) -> None:
        """RN-29."""
        with violates(seeded_session, "uq_payroll_receipts_teacher_id_year_month_fortnight"):
            seeded_session.add(build_receipt(teacher, 2026, 10, Fortnight.SECOND))

    def test_other_teachers_can_issue_the_same_period(
        self, seeded_session: Session, receipt: PayrollReceipt
    ) -> None:
        other = build_receipt(create_teacher(seeded_session), 2026, 10, Fortnight.SECOND)
        seeded_session.add(other)
        seeded_session.flush()

    def test_folio_number_comes_from_a_database_sequence(
        self, seeded_session: Session, receipt: PayrollReceipt
    ) -> None:
        """RN-30: el consecutivo lo asigna la base, nunca la aplicación."""
        following = build_receipt(create_teacher(seeded_session), 2026, 10, Fortnight.SECOND)
        seeded_session.add(following)
        seeded_session.flush()

        assert following.folio_number > receipt.folio_number

    def test_folio_is_unique(
        self, seeded_session: Session, receipt: PayrollReceipt, teacher: Teacher
    ) -> None:
        duplicate = build_receipt(teacher, 2026, 11, Fortnight.FIRST)
        duplicate.folio = receipt.folio

        with violates(seeded_session, "uq_payroll_receipts_folio"):
            seeded_session.add(duplicate)

    @pytest.mark.parametrize(
        ("year", "month", "fortnight", "expected_end"),
        [
            (2026, 10, Fortnight.FIRST, date(2026, 10, 15)),
            (2026, 10, Fortnight.SECOND, date(2026, 10, 31)),
            (2026, 11, Fortnight.SECOND, date(2026, 11, 30)),
            (2027, 2, Fortnight.SECOND, date(2027, 2, 28)),
            (2028, 2, Fortnight.SECOND, date(2028, 2, 29)),  # bisiesto
        ],
    )
    def test_period_dates_follow_the_fortnight(
        self,
        seeded_session: Session,
        teacher: Teacher,
        year: int,
        month: int,
        fortnight: Fortnight,
        expected_end: date,
    ) -> None:
        """RN-24: la base acepta exactamente los límites de cada quincena."""
        receipt = build_receipt(teacher, year, month, fortnight)
        seeded_session.add(receipt)
        seeded_session.flush()

        assert receipt.period_end == expected_end

    def test_period_end_must_match_the_fortnight(
        self, seeded_session: Session, teacher: Teacher
    ) -> None:
        receipt = build_receipt(teacher, 2028, 2, Fortnight.SECOND)
        receipt.period_end = date(2028, 2, 28)

        with violates(seeded_session, "ck_payroll_receipts_period_end_matches"):
            seeded_session.add(receipt)

    def test_period_start_must_match_the_fortnight(
        self, seeded_session: Session, teacher: Teacher
    ) -> None:
        receipt = build_receipt(teacher, 2026, 10, Fortnight.SECOND)
        receipt.period_start = date(2026, 10, 15)

        with violates(seeded_session, "ck_payroll_receipts_period_start_matches"):
            seeded_session.add(receipt)

    def test_fortnight_is_one_or_two(self, seeded_session: Session, teacher: Teacher) -> None:
        receipt = build_receipt(teacher, 2026, 10, Fortnight.SECOND)
        receipt.fortnight = 3

        with violates(seeded_session, "ck_payroll_receipts_fortnight_valid"):
            seeded_session.add(receipt)

    def test_total_hours_is_computed_from_minutes(
        self, seeded_session: Session, teacher: Teacher
    ) -> None:
        receipt = build_receipt(teacher, 2026, 10, Fortnight.FIRST)
        receipt.total_minutes = 750
        seeded_session.add(receipt)
        seeded_session.flush()
        seeded_session.refresh(receipt)

        assert receipt.total_hours == Decimal("12.50")

    def test_issued_receipt_cannot_be_modified(
        self, seeded_session: Session, receipt: PayrollReceipt
    ) -> None:
        """RN-28: el recibo emitido es una copia fija."""
        with violates(seeded_session, "trg_payroll_receipts_immutable"):
            receipt.total_amount = Decimal("1.00")

    def test_issued_receipt_cannot_be_deleted(
        self, seeded_session: Session, receipt: PayrollReceipt
    ) -> None:
        with violates(seeded_session, "trg_payroll_receipts_immutable"):
            seeded_session.execute(delete(PayrollReceipt).where(PayrollReceipt.id == receipt.id))

    def test_teacher_with_receipts_cannot_be_deleted(
        self, seeded_session: Session, receipt: PayrollReceipt, teacher: Teacher
    ) -> None:
        with violates(seeded_session, "fk_payroll_receipts_teacher_id_teachers"):
            seeded_session.execute(delete(Teacher).where(Teacher.id == teacher.id))


class TestReceiptLine:
    @pytest.mark.parametrize(
        ("minutes", "rate", "amount"),
        [
            (90, Decimal("125.00"), Decimal("187.50")),
            (50, Decimal("135.00"), Decimal("112.50")),
            (1, Decimal("145.00"), Decimal("2.42")),  # 2.41666…
            (1, Decimal("0.30"), Decimal("0.01")),  # 0.005: la mitad se redondea hacia arriba
        ],
    )
    def test_amount_is_minutes_times_rate_rounded_half_up(
        self,
        seeded_session: Session,
        receipt: PayrollReceipt,
        assignment: Assignment,
        minutes: int,
        rate: Decimal,
        amount: Decimal,
    ) -> None:
        """RN-25 y RN-26: la base comparte la regla de redondeo con ``Decimal`` de Python."""
        assert (minutes * rate / MINUTES_PER_HOUR).quantize(CENT, ROUND_HALF_UP) == amount
        line = build_receipt_line(receipt, assignment, minutes, rate, amount)
        seeded_session.add(line)
        seeded_session.flush()
        seeded_session.refresh(line)

        assert line.hours == (Decimal(minutes) / MINUTES_PER_HOUR).quantize(CENT, ROUND_HALF_UP)

    def test_amount_that_does_not_match_the_rate_is_rejected(
        self, seeded_session: Session, receipt: PayrollReceipt, assignment: Assignment
    ) -> None:
        line = build_receipt_line(receipt, assignment, 60, Decimal("125.00"), Decimal("130.00"))

        with violates(seeded_session, "ck_payroll_receipt_lines_amount_matches_rate"):
            seeded_session.add(line)

    def test_one_line_per_assignment_and_rate(
        self, seeded_session: Session, receipt: PayrollReceipt, assignment: Assignment
    ) -> None:
        seeded_session.add(
            build_receipt_line(receipt, assignment, 60, Decimal("125.00"), Decimal("125.00"))
        )
        seeded_session.flush()

        with violates(
            seeded_session, "uq_payroll_receipt_lines_receipt_id_assignment_id_hourly_rate"
        ):
            seeded_session.add(
                build_receipt_line(receipt, assignment, 30, Decimal("125.00"), Decimal("62.50"))
            )

    def test_a_rate_change_inside_the_period_is_a_second_line(
        self, seeded_session: Session, receipt: PayrollReceipt, assignment: Assignment
    ) -> None:
        seeded_session.add_all(
            [
                build_receipt_line(receipt, assignment, 60, Decimal("125.00"), Decimal("125.00")),
                build_receipt_line(receipt, assignment, 60, Decimal("135.00"), Decimal("135.00")),
            ]
        )

        seeded_session.flush()

    def test_assignment_must_belong_to_the_receipt_teacher(
        self,
        seeded_session: Session,
        receipt: PayrollReceipt,
        career: Career,
        hourly_rate: HourlyRate,
    ) -> None:
        foreign = create_assignment(
            seeded_session, create_teacher(seeded_session), career, hourly_rate
        )

        with violates(
            seeded_session, "fk_payroll_receipt_lines_assignment_id_teacher_id_assignments"
        ):
            seeded_session.add(
                build_receipt_line(receipt, foreign, 60, Decimal("125.00"), Decimal("125.00"))
            )

    def test_lines_are_immutable(
        self, seeded_session: Session, receipt: PayrollReceipt, assignment: Assignment
    ) -> None:
        line = build_receipt_line(receipt, assignment, 60, Decimal("125.00"), Decimal("125.00"))
        seeded_session.add(line)
        seeded_session.flush()

        with violates(seeded_session, "trg_payroll_receipt_lines_immutable"):
            line.subject_name = "Otra materia"

    def test_snapshot_survives_catalog_changes(
        self,
        seeded_session: Session,
        receipt: PayrollReceipt,
        assignment: Assignment,
        career: Career,
    ) -> None:
        """RN-28: renombrar la carrera no altera lo que dice el recibo emitido."""
        line = build_receipt_line(receipt, assignment, 60, Decimal("125.00"), Decimal("125.00"))
        seeded_session.add(line)
        seeded_session.flush()

        career.name = "Ingeniería en Sistemas Computacionales (plan 2030)"
        seeded_session.flush()
        seeded_session.refresh(line)

        assert line.career_name == "Ingeniería en Sistemas Computacionales"
