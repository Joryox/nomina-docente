"""Lógica de negocio (etapa 4): bajas lógicas y tarifa congelada en la bitácora.

1. ``subjects.is_active``: una materia usada en asignaciones no se borra, se desactiva.
2. ``assignments.active_until``: último día en que la asignación estuvo activa. Permite
   validar que «la asignación estaba activa en la fecha de la sesión». Un ``CHECK`` exige
   que exista si y solo si la asignación está inactiva; las inactivas previas reciben la
   fecha de su última modificación.
3. ``logbook_entries.hourly_rate_id``: tarifa vigente al registrar la sesión. Cambiar la
   tarifa de una asignación ya no altera las sesiones registradas ni la vista previa de
   quincenas anteriores. Las sesiones existentes toman la tarifa actual de su asignación
   (la única que pudieron tener hasta esta versión).
4. ``payroll_receipt_lines``: el renglón es único por recibo, asignación **y tarifa**, para
   representar un cambio de tarifa dentro de la quincena.

Escrita a mano: el relleno de datos y la desactivación temporal de triggers no los genera
autogenerate.

Revision ID: 8c41d2f7a9b3
Revises: 067cd1ed562c
Create Date: 2026-10-25 21:00:00+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8c41d2f7a9b3"
down_revision: str | Sequence[str] | None = "067cd1ed562c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Triggers que no deben dispararse al rellenar la columna nueva: el cierre de periodo
# rechazaría tocar sesiones de quincenas emitidas, y updated_at cambiaría sin que el
# docente haya editado nada.
LOGBOOK_TRIGGERS = ("trg_logbook_entries_period_locked", "trg_logbook_entries_set_updated_at")
OLD_LINE_UNIQUE = "uq_payroll_receipt_lines_receipt_id_assignment_id"
NEW_LINE_UNIQUE = "uq_payroll_receipt_lines_receipt_id_assignment_id_hourly_rate"


def _set_logbook_triggers(enabled: bool) -> None:
    action = "ENABLE" if enabled else "DISABLE"
    for trigger in LOGBOOK_TRIGGERS:
        op.execute(f"ALTER TABLE logbook_entries {action} TRIGGER {trigger}")


def _upgrade_subjects() -> None:
    op.add_column(
        "subjects",
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )


def _upgrade_assignments() -> None:
    op.add_column("assignments", sa.Column("active_until", sa.Date(), nullable=True))
    op.execute(
        "UPDATE assignments "
        "SET active_until = (updated_at AT TIME ZONE 'America/Mexico_City')::date "
        "WHERE NOT is_active"
    )
    op.create_check_constraint(
        op.f("ck_assignments_active_until_consistent"),
        "assignments",
        "is_active = (active_until IS NULL)",
    )


def _upgrade_logbook_entries() -> None:
    op.add_column("logbook_entries", sa.Column("hourly_rate_id", sa.BigInteger(), nullable=True))
    _set_logbook_triggers(enabled=False)
    op.execute(
        "UPDATE logbook_entries AS l SET hourly_rate_id = a.hourly_rate_id "
        "FROM assignments AS a WHERE a.id = l.assignment_id"
    )
    _set_logbook_triggers(enabled=True)
    op.alter_column("logbook_entries", "hourly_rate_id", nullable=False)
    op.create_foreign_key(
        op.f("fk_logbook_entries_hourly_rate_id_hourly_rates"),
        "logbook_entries",
        "hourly_rates",
        ["hourly_rate_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        op.f("ix_logbook_entries_hourly_rate_id"), "logbook_entries", ["hourly_rate_id"]
    )


def _upgrade_receipt_lines() -> None:
    op.drop_constraint(OLD_LINE_UNIQUE, "payroll_receipt_lines", type_="unique")
    op.create_unique_constraint(
        NEW_LINE_UNIQUE, "payroll_receipt_lines", ["receipt_id", "assignment_id", "hourly_rate"]
    )


def upgrade() -> None:
    _upgrade_subjects()
    _upgrade_assignments()
    _upgrade_logbook_entries()
    _upgrade_receipt_lines()


def downgrade() -> None:
    # Falla si algún recibo tiene dos renglones de la misma asignación (cambio de tarifa
    # dentro de la quincena): esos recibos no caben en el esquema anterior.
    op.drop_constraint(NEW_LINE_UNIQUE, "payroll_receipt_lines", type_="unique")
    op.create_unique_constraint(
        OLD_LINE_UNIQUE, "payroll_receipt_lines", ["receipt_id", "assignment_id"]
    )
    op.drop_index(op.f("ix_logbook_entries_hourly_rate_id"), table_name="logbook_entries")
    op.drop_constraint(
        op.f("fk_logbook_entries_hourly_rate_id_hourly_rates"),
        "logbook_entries",
        type_="foreignkey",
    )
    op.drop_column("logbook_entries", "hourly_rate_id")
    op.drop_constraint(op.f("ck_assignments_active_until_consistent"), "assignments", type_="check")
    op.drop_column("assignments", "active_until")
    op.drop_column("subjects", "is_active")
