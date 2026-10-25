from datetime import date, timedelta
from itertools import pairwise

import pytest

from app.core.constants import Fortnight
from app.domain.periods import Period, last_day_of_month, periods_of_year


class TestPeriodContaining:
    @pytest.mark.parametrize(
        ("day", "expected"),
        [
            (date(2026, 10, 1), Period(2026, 10, Fortnight.FIRST)),
            (date(2026, 10, 15), Period(2026, 10, Fortnight.FIRST)),
            (date(2026, 10, 16), Period(2026, 10, Fortnight.SECOND)),
            (date(2026, 10, 31), Period(2026, 10, Fortnight.SECOND)),
            (date(2028, 2, 29), Period(2028, 2, Fortnight.SECOND)),
            (date(2026, 12, 31), Period(2026, 12, Fortnight.SECOND)),
        ],
    )
    def test_day_15_and_16_split_the_month(self, day: date, expected: Period) -> None:
        assert Period.containing(day) == expected

    def test_every_day_of_a_year_belongs_to_exactly_one_period(self) -> None:
        periods = periods_of_year(2026)
        day = date(2026, 1, 1)
        while day.year == 2026:
            assert [period for period in periods if period.contains(day)] == [
                Period.containing(day)
            ]
            day += timedelta(days=1)


class TestPeriodBounds:
    @pytest.mark.parametrize(
        ("year", "month", "last_day"),
        [
            (2026, 2, 28),  # febrero normal
            (2028, 2, 29),  # febrero bisiesto
            (2100, 2, 28),  # divisible entre 100 y no entre 400: no es bisiesto
            (2000, 2, 29),  # divisible entre 400: bisiesto
            (2026, 4, 30),
            (2026, 10, 31),
        ],
    )
    def test_second_fortnight_ends_on_the_last_day_of_the_month(
        self, year: int, month: int, last_day: int
    ) -> None:
        period = Period(year, month, Fortnight.SECOND)

        assert period.start == date(year, month, 16)
        assert period.end == date(year, month, last_day)
        assert last_day_of_month(year, month) == last_day

    def test_first_fortnight_is_always_days_1_to_15(self) -> None:
        for month in range(1, 13):
            period = Period(2026, month, Fortnight.FIRST)
            assert (period.start.day, period.end.day, period.day_count) == (1, 15, 15)

    def test_the_24_periods_of_a_year_cover_it_without_gaps(self) -> None:
        periods = periods_of_year(2028)

        assert len(periods) == 24
        assert periods[0].start == date(2028, 1, 1)
        assert periods[-1].end == date(2028, 12, 31)
        assert sum(period.day_count for period in periods) == 366
        for current, following in pairwise(periods):
            assert following.start == current.end + timedelta(days=1)
            assert current.next() == following
            assert following.previous() == current

    def test_days_lists_every_date_of_the_period(self) -> None:
        days = list(Period(2026, 2, Fortnight.SECOND).days())

        assert days[0] == date(2026, 2, 16)
        assert days[-1] == date(2026, 2, 28)
        assert len(days) == 13


class TestPeriodValidation:
    @pytest.mark.parametrize(("year", "month"), [(1999, 1), (2101, 1), (2026, 0), (2026, 13)])
    def test_rejects_out_of_range_year_or_month(self, year: int, month: int) -> None:
        with pytest.raises(ValueError, match="debe estar entre"):
            Period(year, month, Fortnight.FIRST)

    def test_rejects_an_invalid_fortnight(self) -> None:
        with pytest.raises(ValueError, match="3"):
            Period(2026, 10, 3)  # type: ignore[arg-type]

    def test_accepts_the_fortnight_number(self) -> None:
        assert Period(2026, 10, 2) == Period(2026, 10, Fortnight.SECOND)  # type: ignore[arg-type]


class TestPeriodState:
    period = Period(2026, 10, Fortnight.FIRST)

    @pytest.mark.parametrize(
        ("today", "future", "finished"),
        [
            (date(2026, 9, 30), True, False),
            (date(2026, 10, 1), False, False),
            (date(2026, 10, 15), False, False),
            (date(2026, 10, 16), False, True),
        ],
    )
    def test_future_and_finished(self, today: date, future: bool, finished: bool) -> None:
        assert self.period.is_future(today) is future
        assert self.period.is_finished(today) is finished


def test_labels_in_spanish() -> None:
    period = Period(2026, 10, Fortnight.SECOND)

    assert period.label() == "2.ª quincena de octubre de 2026"
    assert period.range_label() == "16 al 31 de octubre"
    assert Period(2028, 2, Fortnight.FIRST).label() == "1.ª quincena de febrero de 2028"
