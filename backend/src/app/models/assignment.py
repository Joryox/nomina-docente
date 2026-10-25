from sqlalchemy import BigInteger, ForeignKey, ForeignKeyConstraint, Index, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin


class Assignment(IdentityPkMixin, PublicIdMixin, TimestampMixin, Base):
    """Docente + materia + carrera + tarifa por hora (RN-13)."""

    __tablename__ = "assignments"
    __table_args__ = (
        # La materia debe pertenecer al mismo docente de la asignación.
        ForeignKeyConstraint(
            ["subject_id", "teacher_id"],
            ["subjects.id", "subjects.teacher_id"],
            ondelete="RESTRICT",
        ),
        # Destino de las llaves compuestas de schedules, logbook_entries y recibos.
        UniqueConstraint("id", "teacher_id"),
        # RN-14: una sola asignación activa por materia y carrera. Las inactivas conservan
        # su historial y permiten crear otra, por ejemplo con una tarifa distinta.
        Index(
            "uq_assignments_active_teacher_subject_career",
            "teacher_id",
            "subject_id",
            "career_id",
            unique=True,
            postgresql_where="is_active",
        ),
        Index("ix_assignments_subject_id_teacher_id", "subject_id", "teacher_id"),
        {"comment": "Asignación: docente + materia + carrera + tarifa por hora."},
    )

    teacher_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="RESTRICT"), index=True
    )
    subject_id: Mapped[int] = mapped_column(BigInteger)
    career_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("careers.id", ondelete="RESTRICT"), index=True
    )
    # RN-11: la llave foránea impide usar una tarifa que no esté en el catálogo.
    hourly_rate_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("hourly_rates.id", ondelete="RESTRICT"), index=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
