from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    UniqueConstraint,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.career import Career
    from app.models.hourly_rate import HourlyRate
    from app.models.schedule import Schedule
    from app.models.subject import Subject


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
        # Una asignación activa no tiene fecha de fin; una desactivada siempre la tiene.
        CheckConstraint("is_active = (active_until IS NULL)", name="active_until_consistent"),
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
    # Último día en que estuvo activa (zona de la institución). Se pueden registrar sesiones
    # con fecha hasta ese día, aunque la asignación ya esté desactivada.
    active_until: Mapped[date | None]

    # Relaciones de solo lectura: las llaves se escriben explícitamente y las llaves
    # compuestas (con teacher_id) no deben sincronizarse desde el ORM.
    subject: Mapped["Subject"] = relationship(viewonly=True, lazy="raise_on_sql")
    career: Mapped["Career"] = relationship(viewonly=True, lazy="raise_on_sql")
    hourly_rate: Mapped["HourlyRate"] = relationship(viewonly=True, lazy="raise_on_sql")
    schedules: Mapped[list["Schedule"]] = relationship(
        viewonly=True,
        lazy="raise_on_sql",
        order_by="(Schedule.weekday, Schedule.start_time)",
    )
