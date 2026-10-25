from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import CATALOG_CODE_MAX_LENGTH, CATALOG_NAME_MAX_LENGTH
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin, TimestampMixin
from app.models.career_type import CareerType


class Career(IdentityPkMixin, TimestampMixin, Base):
    """Catálogo de carreras (RN-05). Se da de baja con ``is_active``, nunca se borra (RN-07)."""

    __tablename__ = "careers"
    __table_args__ = (
        CheckConstraint("code ~ '^[A-Z][A-Z0-9]*$'", name="code_format"),
        CheckConstraint(trimmed_not_blank("name"), name="name_trimmed"),
        {"comment": "Catálogo de carreras del TESH."},
    )

    code: Mapped[str] = mapped_column(String(CATALOG_CODE_MAX_LENGTH), unique=True)
    name: Mapped[str] = mapped_column(String(CATALOG_NAME_MAX_LENGTH), unique=True)
    career_type_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("career_types.id", ondelete="RESTRICT"), index=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())

    career_type: Mapped[CareerType] = relationship()
