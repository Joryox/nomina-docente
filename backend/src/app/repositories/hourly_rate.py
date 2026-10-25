from decimal import Decimal

from sqlalchemy import select

from app.models.hourly_rate import HourlyRate
from app.repositories.base import BaseRepository


class HourlyRateRepository(BaseRepository[HourlyRate]):
    model = HourlyRate

    def get_by_amount(self, amount: Decimal) -> HourlyRate | None:
        return self._find_one(HourlyRate.amount == amount)

    def list_active(self, *, offset: int, limit: int) -> tuple[list[HourlyRate], int]:
        """Tarifas vigentes para el selector (RN-11), de menor a mayor."""
        statement = select(HourlyRate).where(HourlyRate.is_active).order_by(HourlyRate.amount)
        return self._paginate(statement, offset=offset, limit=limit)
