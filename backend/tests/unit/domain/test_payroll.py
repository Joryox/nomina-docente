from decimal import Decimal

from app.domain.payroll import SessionForPayroll, calculate_payroll

RATE_125 = Decimal("125.00")
RATE_135 = Decimal("135.00")
RATE_145 = Decimal("145.00")


def _session(
    key: int, minutes: int, rate: Decimal, subject: str = "Bases de Datos"
) -> SessionForPayroll:
    return SessionForPayroll(
        assignment_key=key,
        subject_name=subject,
        career_name="Ingeniería en Sistemas Computacionales",
        hourly_rate=rate,
        minutes=minutes,
    )


def test_groups_sessions_by_assignment_and_sums_exact_minutes() -> None:
    result = calculate_payroll([_session(1, 50, RATE_125), _session(1, 50, RATE_125)])

    (line,) = result.lines
    assert (line.session_count, line.minutes) == (2, 100)
    # Se redondea una vez sobre 100 minutos (208.333…), no dos veces sobre 50 (104.17 × 2).
    assert line.amount == Decimal("208.33")
    assert line.hours == Decimal("1.67")
    assert result.total_amount == Decimal("208.33")


def test_total_is_the_sum_of_rounded_lines() -> None:
    sessions = [
        _session(1, 50, RATE_125, "Bases de Datos"),  # 104.17
        _session(2, 50, RATE_145, "Cálculo Diferencial"),  # 120.83
        _session(3, 90, RATE_135, "Programación"),  # 202.50
    ]

    result = calculate_payroll(sessions)

    assert [line.amount for line in result.lines] == [
        Decimal("104.17"),
        Decimal("120.83"),
        Decimal("202.50"),
    ]
    assert result.total_amount == Decimal("427.50")
    assert result.total_minutes == 190
    assert result.total_hours == Decimal("3.17")
    assert result.session_count == 3


def test_rate_change_inside_the_period_produces_one_line_per_rate() -> None:
    result = calculate_payroll([_session(1, 60, RATE_125), _session(1, 60, RATE_135)])

    assert [(line.hourly_rate, line.amount) for line in result.lines] == [
        (RATE_125, Decimal("125.00")),
        (RATE_135, Decimal("135.00")),
    ]
    assert result.total_amount == Decimal("260.00")


def test_lines_are_ordered_by_subject_ignoring_accents() -> None:
    result = calculate_payroll(
        [_session(2, 60, RATE_125, "Programación"), _session(1, 60, RATE_125, "Álgebra")]
    )

    assert [line.subject_name for line in result.lines] == ["Álgebra", "Programación"]


def test_empty_period() -> None:
    result = calculate_payroll([])

    assert result.is_empty
    assert result.total_amount == Decimal("0.00")
    assert result.total_hours == Decimal("0.00")


def test_a_full_fortnight_does_not_lose_cents() -> None:
    # 11 sesiones de 50 min a $145 en una asignación: 550 min → 1329.1666… → 1329.17.
    result = calculate_payroll([_session(1, 50, RATE_145) for _ in range(11)])

    assert result.total_amount == Decimal("1329.17")
    assert result.total_hours == Decimal("9.17")
