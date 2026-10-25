from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import CATALOG_CODE_MAX_LENGTH, CATALOG_NAME_MAX_LENGTH
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin, TimestampMixin


class CareerType(IdentityPkMixin, TimestampMixin, Base):
    """Tipo de programa (ingeniería, licenciatura…). Es catálogo y no un ``CHECK`` para que
    un tipo nuevo (por ejemplo, bachillerato) se agregue solo con datos semilla."""

    __tablename__ = "career_types"
    __table_args__ = (
        CheckConstraint("code ~ '^[a-z][a-z_]*$'", name="code_format"),
        CheckConstraint(trimmed_not_blank("name"), name="name_trimmed"),
        {"comment": "Catálogo de tipos de carrera (ingeniería, licenciatura)."},
    )

    code: Mapped[str] = mapped_column(String(CATALOG_CODE_MAX_LENGTH), unique=True)
    name: Mapped[str] = mapped_column(String(CATALOG_NAME_MAX_LENGTH), unique=True)
