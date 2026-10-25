from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import CreatedAtMixin


class UserRole(CreatedAtMixin, Base):
    """Relación N:M entre usuarios y roles. ``created_at`` registra cuándo se otorgó."""

    __tablename__ = "user_roles"
    __table_args__ = ({"comment": "Roles otorgados a cada usuario (relación N:M)."},)

    # La asignación de un rol no tiene valor propio sin el usuario: se borra con él.
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("roles.id", ondelete="RESTRICT"), primary_key=True, index=True
    )
