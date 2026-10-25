from decimal import Decimal

from app.models.hourly_rate import HourlyRate
from app.repositories.base import BaseRepository


class HourlyRateRepository(BaseRepository[HourlyRate]):
    model = HourlyRate

    def get_by_amount(self, amount: Decimal) -> HourlyRate | None:
        return self._find_one(HourlyRate.amount == amount)
