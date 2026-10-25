from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.models import Career, HourlyRate
from tests.helpers import violates

pytestmark = pytest.mark.db


def test_hourly_rate_amount_cannot_change(hourly_rate: HourlyRate, seeded_session: Session) -> None:
    """RN-12: el importe es inmutable; un cambio de tabulador es una tarifa nueva."""
    with violates(seeded_session, "trg_hourly_rates_amount_immutable"):
        hourly_rate.amount = Decimal("130.00")


def test_hourly_rate_can_be_deactivated(hourly_rate: HourlyRate, seeded_session: Session) -> None:
    hourly_rate.is_active = False
    seeded_session.flush()
    seeded_session.refresh(hourly_rate)

    assert hourly_rate.is_active is False
    assert hourly_rate.amount == Decimal("125.00")


@pytest.mark.parametrize("amount", [Decimal("0.00"), Decimal("-125.00")])
def test_hourly_rate_amount_must_be_positive(db_session: Session, amount: Decimal) -> None:
    with violates(db_session, "ck_hourly_rates_amount_positive"):
        db_session.add(HourlyRate(amount=amount))


def test_hourly_rate_amount_is_unique(seeded_session: Session) -> None:
    with violates(seeded_session, "uq_hourly_rates_amount"):
        seeded_session.add(HourlyRate(amount=Decimal("125.00")))


def test_career_code_must_be_uppercase(career: Career, seeded_session: Session) -> None:
    with violates(seeded_session, "ck_careers_code_format"):
        seeded_session.add(
            Career(code="isc2", name="Otra carrera", career_type_id=career.career_type_id)
        )


def test_career_name_is_unique(career: Career, seeded_session: Session) -> None:
    with violates(seeded_session, "uq_careers_name"):
        seeded_session.add(
            Career(code="ISC2", name=career.name, career_type_id=career.career_type_id)
        )


def test_career_type_must_exist(seeded_session: Session) -> None:
    with violates(seeded_session, "fk_careers_career_type_id_career_types"):
        seeded_session.add(Career(code="LDER", name="Licenciatura en Derecho", career_type_id=0))
