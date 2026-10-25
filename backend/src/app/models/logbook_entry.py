from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import LOGBOOK_NOTES_MAX_LENGTH
from app.db.base import Base
from app.db.checks import trimmed_not_blank, whole_minute
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.assignment import Assignment
    from app.models.hourly_rate import HourlyRate


class LogbookEntry(IdentityPkMixin, PublicIdMixin, TimestampMixin, Base):
    """Sesión realmente impartida (RN-19).

    El trigger ``trg_logbook_entries_period_locked`` impide crear, editar o borrar sesiones
    de un periodo que ya tiene recibo emitido (RN-23).
    """

    __tablename__ = "logbook_entries"
    __table_args__ = (
        # RESTRICT: una asignación con bitácora no se puede borrar (RN-15).
        ForeignKeyConstraint(
            ["assignment_id", "teacher_id"],
            ["assignments.id", "assignments.teacher_id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint("end_time > start_time", name="end_after_start"),
        CheckConstraint(whole_minute("start_time"), name="start_time_whole_minute"),
        CheckConstraint(whole_minute("end_time"), name="end_time_whole_minute"),
        CheckConstraint(trimmed_not_blank("notes"), name="notes_trimmed"),
        # RN-22: dos sesiones del mismo docente en la misma fecha no se empalman.
        ExcludeConstraint(
            ("teacher_id", "="),
            ("session_date", "="),
            (text("timerange(start_time, end_time, '[)')"), "&&"),
            name="ex_logbook_entries_no_overlap",
            using="gist",
        ),
        Index("ix_logbook_entries_assignment_id_teacher_id", "assignment_id", "teacher_id"),
        # Consulta principal: bitácora de un docente en un rango de fechas (periodo).
        Index("ix_logbook_entries_teacher_id_session_date", "teacher_id", "session_date"),
        {"comment": "Bitácora: sesiones realmente impartidas."},
    )

    assignment_id: Mapped[int] = mapped_column(BigInteger)
    teacher_id: Mapped[int] = mapped_column(BigInteger)
    session_date: Mapped[date]
    start_time: Mapped[time]
    end_time: Mapped[time]
    notes: Mapped[str | None] = mapped_column(String(LOGBOOK_NOTES_MAX_LENGTH))
    # Tarifa vigente de la asignación cuando se registró la sesión. Como el importe de una
    # tarifa es inmutable (RN-12), la llave foránea congela el precio de la sesión: cambiar
    # la tarifa de la asignación no altera las sesiones ya registradas.
    hourly_rate_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("hourly_rates.id", ondelete="RESTRICT"), index=True
    )

    assignment: Mapped["Assignment"] = relationship(viewonly=True, lazy="raise_on_sql")
    hourly_rate: Mapped["HourlyRate"] = relationship(viewonly=True, lazy="raise_on_sql")
