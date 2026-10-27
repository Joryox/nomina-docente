"""Importe con letra para el recibo (RN-27), como se escribe en los documentos mexicanos:

    1250.00  → «Mil doscientos cincuenta pesos 00/100 M.N.»
    1.00     → «Un peso 00/100 M.N.»
    2000000  → «Dos millones de pesos 00/100 M.N.»

Los centavos van en número sobre 100. El importe llega ya redondeado a centavos
(``money.round_money``); este módulo no redondea.
"""

from decimal import Decimal

from app.core.constants import MONEY_DECIMAL_PLACES

_UNITS = (
    "",
    "un",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
    "veinte",
    "veintiún",
    "veintidós",
    "veintitrés",
    "veinticuatro",
    "veinticinco",
    "veintiséis",
    "veintisiete",
    "veintiocho",
    "veintinueve",
)
_TENS = ("", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa")
_HUNDREDS = (
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
)
_THOUSAND = 1_000
_MILLION = 1_000_000
_HUNDRED = 100
_CENTS_PER_PESO = 10**MONEY_DECIMAL_PLACES
_CURRENCY_SUFFIX = "M.N."


def _below_hundred(number: int) -> str:
    if number < len(_UNITS):
        return _UNITS[number]
    tens, units = divmod(number, 10)
    return _TENS[tens] if units == 0 else f"{_TENS[tens]} y {_UNITS[units]}"


def _below_thousand(number: int) -> str:
    if number == _HUNDRED:
        return "cien"
    hundreds, rest = divmod(number, _HUNDRED)
    return " ".join(part for part in (_HUNDREDS[hundreds], _below_hundred(rest)) if part)


def _below_million(number: int) -> str:
    thousands, rest = divmod(number, _THOUSAND)
    if thousands == 0:
        return _below_thousand(rest)
    prefix = "mil" if thousands == 1 else f"{_below_thousand(thousands)} mil"
    return " ".join(part for part in (prefix, _below_thousand(rest)) if part)


def integer_in_words(number: int) -> str:
    """Número entero no negativo en palabras, con apócope ante sustantivo («un», «veintiún»)."""
    if number < 0:
        raise ValueError("El importe no puede ser negativo.")
    if number == 0:
        return "cero"
    millions, rest = divmod(number, _MILLION)
    if millions == 0:
        return _below_million(rest)
    prefix = "un millón" if millions == 1 else f"{_below_million(millions)} millones"
    return " ".join(part for part in (prefix, _below_million(rest)) if part)


def amount_in_words(amount: Decimal) -> str:
    """Importe en pesos con letra y centavos en número: «Mil doscientos cincuenta pesos
    00/100 M.N.»."""
    total_cents = int(amount * _CENTS_PER_PESO)
    pesos, cents = divmod(total_cents, _CENTS_PER_PESO)
    words = integer_in_words(pesos)
    if pesos == 1:
        currency = "peso"
    elif pesos > 0 and pesos % _MILLION == 0:
        # «Dos millones de pesos»: tras millón o millones exactos va «de».
        currency = "de pesos"
    else:
        currency = "pesos"
    text = (
        f"{words} {currency} {cents:0{MONEY_DECIMAL_PLACES}d}/{_CENTS_PER_PESO} {_CURRENCY_SUFFIX}"
    )
    return text[0].upper() + text[1:]
