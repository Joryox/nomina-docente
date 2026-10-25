from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import EMPLOYEE_NUMBER_MAX_LENGTH, PERSON_NAME_MAX_LENGTH
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Teacher(IdentityPkMixin, TimestampMixin, Base):
    """Perfil del docente (1:1 con ``users``)."""

    __tablename__ = "teachers"
    __table_args__ = (
        CheckConstraint(trimmed_not_blank("first_names"), name="first_names_trimmed"),
        CheckConstraint(trimmed_not_blank("paternal_surname"), name="paternal_surname_trimmed"),
        CheckConstraint(trimmed_not_blank("maternal_surname"), name="maternal_surname_trimmed"),
        CheckConstraint(trimmed_not_blank("employee_number"), name="employee_number_trimmed"),
        {"comment": "Perfil del docente (1:1 con users)."},
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), unique=True
    )
    first_names: Mapped[str] = mapped_column(String(PERSON_NAME_MAX_LENGTH))
    paternal_surname: Mapped[str] = mapped_column(String(PERSON_NAME_MAX_LENGTH))
    # Opcional: hay personas con un solo apellido.
    maternal_surname: Mapped[str | None] = mapped_column(String(PERSON_NAME_MAX_LENGTH))
    # UNIQUE admite varios NULL: el número es único solo cuando se captura (RN-03).
    employee_number: Mapped[str | None] = mapped_column(
        String(EMPLOYEE_NUMBER_MAX_LENGTH), unique=True
    )

    user: Mapped["User"] = relationship(back_populates="teacher")
