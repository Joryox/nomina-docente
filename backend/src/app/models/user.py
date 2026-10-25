from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import EMAIL_MAX_LENGTH, PASSWORD_HASH_MAX_LENGTH
from app.db.base import Base
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.teacher import Teacher


class User(IdentityPkMixin, PublicIdMixin, TimestampMixin, Base):
    """Cuenta de acceso: identidad y credenciales, separada del perfil del docente."""

    __tablename__ = "users"
    __table_args__ = (
        # El correo se guarda normalizado (RN-02); así el UNIQUE de la columna ya compara
        # sin distinguir mayúsculas ni espacios.
        CheckConstraint("email = lower(btrim(email))", name="email_normalized"),
        CheckConstraint(r"email ~ '^[^@\s]+@[^@\s]+$'", name="email_format"),
        {"comment": "Cuentas de acceso: identidad y credenciales."},
    )

    email: Mapped[str] = mapped_column(String(EMAIL_MAX_LENGTH), unique=True)
    password_hash: Mapped[str] = mapped_column(String(PASSWORD_HASH_MAX_LENGTH))
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    roles: Mapped[list["Role"]] = relationship(secondary="user_roles")
    # passive_deletes="all": el ORM no intenta desvincular el perfil al borrar la cuenta; la
    # llave foránea RESTRICT de la base decide.
    teacher: Mapped["Teacher | None"] = relationship(back_populates="user", passive_deletes="all")
