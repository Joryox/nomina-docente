from decimal import Decimal

from sqlalchemy import CheckConstraint, Numeric, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import HOURLY_RATE_PRECISION, MONEY_DECIMAL_PLACES
from app.db.base import Base
from app.db.mixins import IdentityPkMixin, TimestampMixin


class HourlyRate(IdentityPkMixin, TimestampMixin, Base):
    """Catálogo de tarifas por hora en MXN (RN-10).

    El importe es inmutable (RN-12): el trigger ``trg_hourly_rates_amount_immutable``
    rechaza cualquier cambio. Para cambiar el tabulador se desactiva la tarifa y se crea otra.
    """

    __tablename__ = "hourly_rates"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        {"comment": "Catálogo de tarifas por hora en MXN; el importe es inmutable."},
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(HOURLY_RATE_PRECISION, MONEY_DECIMAL_PLACES), unique=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
