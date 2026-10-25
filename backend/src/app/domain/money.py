"""Reglas de redondeo de dinero y horas (RN-25, RN-26). Es el único módulo que redondea.

1. La unidad base es el **minuto entero**: horarios y sesiones no tienen segundos.
2. ``hours = minutes / 60`` y ``amount = minutes × tarifa / 60`` se calculan con ``Decimal``
   exacto (nunca ``float``) y se redondean **una sola vez**, al final, a
   ``HOURS_DECIMAL_PLACES`` y ``MONEY_DECIMAL_PLACES`` decimales con ``ROUND_HALF_UP``
   (la mitad se redondea alejándose de cero, como el ``round()`` de ``NUMERIC`` en PostgreSQL).
3. El importe se redondea **por renglón** (asignación y tarifa); el total bruto es la suma
   de los renglones ya redondeados, así el recibo siempre cuadra a simple vista.
4. Las horas totales se calculan desde los minutos totales (igual que la columna generada
   ``payroll_receipts.total_hours``), no sumando horas ya redondeadas.

Ejemplo: 50 minutos a $125.00 → 50 × 125 / 60 = 104.1666… → **$104.17**, y 0.8333… h →
**0.83 h**. 90 minutos a $135.00 → 202.50 exactos → **$202.50**, 1.50 h.
"""

from decimal import ROUND_HALF_UP, Decimal, localcontext

from app.core.constants import HOURS_DECIMAL_PLACES, MINUTES_PER_HOUR, MONEY_DECIMAL_PLACES

# Precisión de trabajo: sobra para importes de hasta 12 dígitos antes de redondear.
_WORKING_PRECISION = 34
MONEY_QUANTUM = Decimal(1).scaleb(-MONEY_DECIMAL_PLACES)
HOURS_QUANTUM = Decimal(1).scaleb(-HOURS_DECIMAL_PLACES)
ZERO_MONEY = Decimal(0).quantize(MONEY_QUANTUM)


def round_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def round_hours(value: Decimal) -> Decimal:
    return value.quantize(HOURS_QUANTUM, rounding=ROUND_HALF_UP)


def minutes_to_hours(minutes: int) -> Decimal:
    with localcontext() as context:
        context.prec = _WORKING_PRECISION
        return round_hours(Decimal(minutes) / MINUTES_PER_HOUR)


def amount_for(minutes: int, hourly_rate: Decimal) -> Decimal:
    """Importe de un renglón: minutos × tarifa / 60, redondeado a centavos."""
    with localcontext() as context:
        context.prec = _WORKING_PRECISION
        return round_money(Decimal(minutes) * hourly_rate / MINUTES_PER_HOUR)


def sum_money(amounts: list[Decimal]) -> Decimal:
    """Suma de importes ya redondeados: exacta, no pierde centavos."""
    return round_money(sum(amounts, ZERO_MONEY))
