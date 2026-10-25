from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.repositories.career import CareerRepository
from app.repositories.career_type import CareerTypeRepository
from app.repositories.hourly_rate import HourlyRateRepository

pytestmark = pytest.mark.db


def test_career_by_code(seeded_session: Session) -> None:
    repository = CareerRepository(seeded_session)

    career = repository.get_by_code("ISC")

    assert career is not None
    assert career.name == "Ingeniería en Sistemas Computacionales"
    assert career.career_type.code == "engineering"
    assert repository.get_by_code("LDER") is None


def test_career_type_by_code(seeded_session: Session) -> None:
    repository = CareerTypeRepository(seeded_session)

    assert repository.get_by_code("bachelor") is not None
    assert repository.get_by_code("high_school") is None


@pytest.mark.parametrize("amount", [Decimal("135"), Decimal("135.0"), Decimal("135.00")])
def test_hourly_rate_by_amount_compares_by_value(seeded_session: Session, amount: Decimal) -> None:
    rate = HourlyRateRepository(seeded_session).get_by_amount(amount)

    assert rate is not None
    assert rate.amount == Decimal("135.00")


def test_unknown_hourly_rate(seeded_session: Session) -> None:
    assert HourlyRateRepository(seeded_session).get_by_amount(Decimal("130.00")) is None
