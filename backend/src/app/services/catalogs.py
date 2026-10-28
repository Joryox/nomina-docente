"""Catálogos de solo lectura para los selectores y reglas publicadas al frontend."""

from app.core.clock import BusinessCalendar
from app.core.constants import (
    GROUP_CODE_MAX_LENGTH,
    MAX_PAGE_SIZE,
    QUICK_LOGBOOK_MAX_ENTRIES,
    SCHEDULE_BATCH_MAX_RANGES,
    TIMEZONE,
)
from app.repositories.career import CareerRepository
from app.repositories.hourly_rate import HourlyRateRepository
from app.schemas.catalogs import BusinessRulesResponse, CareerPage, HourlyRatePage
from app.schemas.common import PageParams
from app.services.policy import BusinessPolicy
from app.services.presenters import career_response, rate_response


class CatalogService:
    def __init__(
        self,
        careers: CareerRepository,
        rates: HourlyRateRepository,
        policy: BusinessPolicy,
        calendar: BusinessCalendar,
    ) -> None:
        self._careers = careers
        self._rates = rates
        self._policy = policy
        self._calendar = calendar

    def list_careers(self, page: PageParams) -> CareerPage:
        careers, total = self._careers.list_active(offset=page.offset, limit=page.page_size)
        result: CareerPage = CareerPage.build([career_response(c) for c in careers], page, total)
        return result

    def list_rates(self, page: PageParams) -> HourlyRatePage:
        rates, total = self._rates.list_active(offset=page.offset, limit=page.page_size)
        result: HourlyRatePage = HourlyRatePage.build(
            [rate_response(rate) for rate in rates], page, total
        )
        return result

    def business_rules(self) -> BusinessRulesResponse:
        return BusinessRulesResponse(
            timezone=TIMEZONE,
            today=self._calendar.today(),
            class_min_duration_minutes=self._policy.class_min_duration_minutes,
            class_max_duration_minutes=self._policy.class_max_duration_minutes,
            logbook_max_age_days=self._policy.logbook_max_age_days,
            payroll_issue_requires_closed_period=self._policy.payroll_issue_requires_closed_period,
            afternoon_shift_start=self._policy.afternoon_shift_start,
            group_code_max_length=GROUP_CODE_MAX_LENGTH,
            schedule_batch_max_ranges=SCHEDULE_BATCH_MAX_RANGES,
            max_page_size=MAX_PAGE_SIZE,
            quick_logbook_max_entries=QUICK_LOGBOOK_MAX_ENTRIES,
        )
