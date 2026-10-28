"""Grupos de clases: la misma materia y carrera en grupos distintos.

1. ``assignments.group_code``: grupo opcional y normalizado («3101»), con un ``CHECK`` de
   formato. Las asignaciones existentes quedan sin grupo.
2. La unicidad de asignaciones activas incluye el grupo y usa ``NULLS NOT DISTINCT``
   (PostgreSQL 15+): dos asignaciones activas sin grupo de la misma materia y carrera siguen
   siendo un duplicado, como antes.
3. ``payroll_receipt_lines.group_code``: copia del grupo al emitir. Los recibos ya emitidos
   quedan sin grupo; agregar una columna nula no reescribe sus renglones ni dispara los
   triggers de inmutabilidad.

Escrita a mano: autogenerate no compara ``NULLS NOT DISTINCT`` y el downgrade necesita
comprobar antes que los datos quepan en la restricción anterior.

Revision ID: 5e7a1c9d3b42
Revises: 8c41d2f7a9b3
Create Date: 2026-10-27 12:00:00+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5e7a1c9d3b42"
down_revision: str | Sequence[str] | None = "8c41d2f7a9b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

GROUP_CODE_MAX_LENGTH = 10
GROUP_CODE_CHECK = "group_code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'"
OLD_UNIQUE = "uq_assignments_active_teacher_subject_career"
NEW_UNIQUE = "uq_assignments_active_teacher_subject_career_group"


def upgrade() -> None:
    for table in ("assignments", "payroll_receipt_lines"):
        op.add_column(
            table, sa.Column("group_code", sa.String(GROUP_CODE_MAX_LENGTH), nullable=True)
        )
        op.create_check_constraint(op.f(f"ck_{table}_group_code_format"), table, GROUP_CODE_CHECK)
    op.drop_index(OLD_UNIQUE, table_name="assignments")
    op.create_index(
        NEW_UNIQUE,
        "assignments",
        ["teacher_id", "subject_id", "career_id", "group_code"],
        unique=True,
        postgresql_where=sa.text("is_active"),
        postgresql_nulls_not_distinct=True,
    )


def downgrade() -> None:
    # Sin el grupo, dos asignaciones activas de la misma materia y carrera en grupos
    # distintos violarían la restricción anterior: se explica antes de intentarlo.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM assignments WHERE is_active
                GROUP BY teacher_id, subject_id, career_id HAVING count(*) > 1
            ) THEN
                RAISE EXCEPTION 'No se puede revertir 5e7a1c9d3b42: hay asignaciones activas de '
                    'la misma materia y carrera en grupos distintos. Desactiva las sobrantes.';
            END IF;
        END $$;
        """
    )
    op.drop_index(NEW_UNIQUE, table_name="assignments")
    op.create_index(
        OLD_UNIQUE,
        "assignments",
        ["teacher_id", "subject_id", "career_id"],
        unique=True,
        postgresql_where=sa.text("is_active"),
    )
    for table in ("payroll_receipt_lines", "assignments"):
        op.drop_constraint(op.f(f"ck_{table}_group_code_format"), table, type_="check")
        op.drop_column(table, "group_code")
