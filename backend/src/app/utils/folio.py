"""Formato del folio del recibo (RN-30): ``{PREFIJO}-{AAAA}{MM}-Q{n}-{consecutivo}``."""

from app.core.constants import FOLIO_NUMBER_DIGITS, FOLIO_TEMPLATE, Fortnight


def build_folio(prefix: str, year: int, month: int, fortnight: Fortnight, number: int) -> str:
    """Arma el folio a partir del consecutivo que entrega la secuencia de la base.

    Si el consecutivo supera los dígitos de relleno, se escribe completo: el folio nunca se
    trunca, así que sigue siendo único.
    """
    return FOLIO_TEMPLATE.format(
        prefix=prefix,
        year=year,
        month=month,
        fortnight=int(fortnight),
        number=number,
        digits=FOLIO_NUMBER_DIGITS,
    )
