from decimal import Decimal

import pytest

from app.domain.money import amount_for, minutes_to_hours, round_money, sum_money

RATE_125 = Decimal("125.00")
RATE_135 = Decimal("135.00")
RATE_145 = Decimal("145.00")


@pytest.mark.parametrize(
    ("minutes", "rate", "expected"),
    [
        (60, RATE_125, Decimal("125.00")),
        (50, RATE_125, Decimal("104.17")),  # 104.1666… sube
        (50, RATE_135, Decimal("112.50")),  # exacto
        (50, RATE_145, Decimal("120.83")),  # 120.8333… baja
        (90, RATE_125, Decimal("187.50")),
        (90, RATE_135, Decimal("202.50")),
        (90, RATE_145, Decimal("217.50")),
        (1, RATE_125, Decimal("2.08")),  # 2.0833…
        (1, RATE_145, Decimal("2.42")),  # 2.41666… sube
        (100, RATE_145, Decimal("241.67")),
        (0, RATE_125, Decimal("0.00")),
    ],
)
def test_amount_is_minutes_times_rate_over_60_rounded_half_up(
    minutes: int, rate: Decimal, expected: Decimal
) -> None:
    amount = amount_for(minutes, rate)

    assert amount == expected
    assert amount.as_tuple().exponent == -2


def test_exactly_half_a_cent_rounds_up() -> None:
    # 3 minutos × 0.10 / 60 = 0.005 exactos.
    assert amount_for(3, Decimal("0.10")) == Decimal("0.01")
    assert round_money(Decimal("0.005")) == Decimal("0.01")
    assert round_money(Decimal("0.0049999")) == Decimal("0.00")


@pytest.mark.parametrize(
    ("minutes", "hours"),
    [
        (60, Decimal("1.00")),
        (50, Decimal("0.83")),
        (90, Decimal("1.50")),
        (100, Decimal("1.67")),
        (45, Decimal("0.75")),
        (1, Decimal("0.02")),
        (2730, Decimal("45.50")),
    ],
)
def test_hours_come_from_exact_minutes(minutes: int, hours: Decimal) -> None:
    assert minutes_to_hours(minutes) == hours


def test_sum_does_not_lose_cents() -> None:
    # Con float, 0.1 sumado diez veces no da 1.0; con Decimal sí.
    assert sum_money([Decimal("0.10")] * 10) == Decimal("1.00")
    assert sum_money([Decimal("104.17")] * 3) == Decimal("312.51")
    assert sum_money([]) == Decimal("0.00")


def test_amount_never_uses_float_precision() -> None:
    # 10 000 h a $145.00: el resultado es exacto aunque el número sea grande.
    assert amount_for(600_000, RATE_145) == Decimal("1450000.00")
    assert amount_for(7, Decimal("99999999.99")) == Decimal("11666666.67")
