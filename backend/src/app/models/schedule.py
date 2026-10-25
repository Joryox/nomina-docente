from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, Index, SmallInteger, text
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import Weekday
from app.db.base import Base
from app.db.checks import whole_minute
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.assignment import Assignment


class Schedule(IdentityPkMixin, PublicIdMixin, TimestampMixin, Base):
    """Horario semanal de una asignación (RN-16)."""

    __tablename__ = "schedules"
    __table_args__ = (
        # teacher_id se repite aquí para la restricción de exclusión; la llave compuesta
        # garantiza que siempre sea el docente de la asignación.
        ForeignKeyConstraint(
            ["assignment_id", "teacher_id"],
            ["assignments.id", "assignments.teacher_id"],
            ondelete="CASCADE",
        ),
        CheckConstraint(
            f"weekday BETWEEN {int(Weekday.MONDAY)} AND {int(Weekday.SUNDAY)}", name="weekday_iso"
        ),
        CheckConstraint("end_time > start_time", name="end_after_start"),
        CheckConstraint(whole_minute("start_time"), name="start_time_whole_minute"),
        CheckConstraint(whole_minute("end_time"), name="end_time_whole_minute"),
        # RN-18: intervalos semiabiertos [entrada, salida) del mismo docente y día no se cruzan.
        ExcludeConstraint(
            ("teacher_id", "="),
            ("weekday", "="),
            (text("timerange(start_time, end_time, '[)')"), "&&"),
            name="ex_schedules_no_overlap",
            using="gist",
        ),
        Index("ix_schedules_assignment_id_teacher_id", "assignment_id", "teacher_id"),
        {"comment": "Horario semanal de cada asignación."},
    )

    assignment_id: Mapped[int] = mapped_column(BigInteger)
    teacher_id: Mapped[int] = mapped_column(BigInteger)
    weekday: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time]
    end_time: Mapped[time]

    assignment: Mapped["Assignment"] = relationship(viewonly=True, lazy="raise_on_sql")
