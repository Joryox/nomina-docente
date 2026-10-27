from decimal import Decimal

import pytest

from app.domain.amount_words import amount_in_words, integer_in_words


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        ("1250.00", "Mil doscientos cincuenta pesos 00/100 M.N."),
        ("0.00", "Cero pesos 00/100 M.N."),
        ("1.00", "Un peso 00/100 M.N."),
        ("0.50", "Cero pesos 50/100 M.N."),
        ("21.00", "Veintiún pesos 00/100 M.N."),
        ("100.00", "Cien pesos 00/100 M.N."),
        ("101.05", "Ciento un pesos 05/100 M.N."),
        ("5221.67", "Cinco mil doscientos veintiún pesos 67/100 M.N."),
        ("16416.00", "Dieciséis mil cuatrocientos dieciséis pesos 00/100 M.N."),
        ("21000.00", "Veintiún mil pesos 00/100 M.N."),
        ("100000.00", "Cien mil pesos 00/100 M.N."),
        ("1000000.00", "Un millón de pesos 00/100 M.N."),
        ("2000000.00", "Dos millones de pesos 00/100 M.N."),
        ("2500001.99", "Dos millones quinientos mil un pesos 99/100 M.N."),
        (
            "9999999999.99",
            "Nueve mil novecientos noventa y nueve millones novecientos noventa y nueve mil "
            "novecientos noventa y nueve pesos 99/100 M.N.",
        ),
    ],
)
def test_amount_in_words(amount: str, expected: str) -> None:
    assert amount_in_words(Decimal(amount)) == expected


@pytest.mark.parametrize(
    ("number", "expected"),
    [
        (16, "dieciséis"),
        (22, "veintidós"),
        (35, "treinta y cinco"),
        (99, "noventa y nueve"),
        (115, "ciento quince"),
        (500, "quinientos"),
        (777, "setecientos setenta y siete"),
        (1001, "mil un"),
        (2026, "dos mil veintiséis"),
    ],
)
def test_integer_in_words(number: int, expected: str) -> None:
    assert integer_in_words(number) == expected


def test_negative_amounts_are_rejected() -> None:
    with pytest.raises(ValueError, match="negativo"):
        integer_in_words(-1)
