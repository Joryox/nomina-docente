from sqlalchemy import CheckConstraint, String, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import (
    CATALOG_CODE_MAX_LENGTH,
    CATALOG_DESCRIPTION_MAX_LENGTH,
    CATALOG_NAME_MAX_LENGTH,
)
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin, TimestampMixin


class Role(IdentityPkMixin, TimestampMixin, Base):
    """Catálogo de roles. En esta versión solo se asigna ``teacher``."""

    __tablename__ = "roles"
    __table_args__ = (
        CheckConstraint("code ~ '^[a-z][a-z_]*$'", name="code_format"),
        CheckConstraint(trimmed_not_blank("name"), name="name_trimmed"),
        {"comment": "Catálogo de roles de usuario."},
    )

    code: Mapped[str] = mapped_column(String(CATALOG_CODE_MAX_LENGTH), unique=True)
    name: Mapped[str] = mapped_column(String(CATALOG_NAME_MAX_LENGTH), unique=True)
    description: Mapped[str | None] = mapped_column(String(CATALOG_DESCRIPTION_MAX_LENGTH))
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
