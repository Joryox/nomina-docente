from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import SUBJECT_CODE_MAX_LENGTH, SUBJECT_NAME_MAX_LENGTH
from app.db.base import Base
from app.db.checks import trimmed_not_blank
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin


class Subject(IdentityPkMixin, PublicIdMixin, TimestampMixin, Base):
    """Materia que registra un docente (RN-08)."""

    __tablename__ = "subjects"
    __table_args__ = (
        CheckConstraint(trimmed_not_blank("name"), name="name_trimmed"),
        CheckConstraint(trimmed_not_blank("code"), name="code_trimmed"),
        # RN-09: sin duplicados por docente, sin distinguir mayúsculas, acentos ni espacios.
        UniqueConstraint("teacher_id", "name_normalized"),
        # Destino de la llave compuesta de assignments: la materia es del mismo docente.
        UniqueConstraint("id", "teacher_id"),
        {"comment": "Materias que registra cada docente."},
    )

    teacher_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column(String(SUBJECT_NAME_MAX_LENGTH))
    code: Mapped[str | None] = mapped_column(String(SUBJECT_CODE_MAX_LENGTH))
    # La calcula la base con normalize_name() (unaccent + minúsculas + espacios simples):
    # ningún escritor puede saltarse la normalización.
    name_normalized: Mapped[str] = mapped_column(
        Text, Computed("normalize_name(name)", persisted=True)
    )
    # Baja lógica: una materia usada en asignaciones conserva su historial y solo se desactiva.
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
