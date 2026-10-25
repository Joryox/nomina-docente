"""Esquema inicial de la nómina docente.

Crea, en este orden:

1. Extensiones, en su propio esquema ``extensions`` para que ``public`` solo tenga objetos
   del sistema: ``btree_gist`` (igualdad de enteros y fechas dentro de índices GiST, para
   las restricciones de no empalme) y ``unaccent`` (comparar nombres sin acentos).
2. Tipo ``timerange`` (PostgreSQL no trae un rango de ``time``) y la función
   ``normalize_name()``, que usa la columna calculada ``subjects.name_normalized``.
3. Funciones de trigger: ``updated_at`` automático, filas inmutables y cierre de bitácora.
4. Tablas, con sus llaves, ``CHECK``, restricciones de exclusión e índices.
5. Triggers.

Autogenerate no detecta extensiones, tipos, funciones, secuencias ni triggers, así que esta
migración se escribió y revisó a mano. Contiene SQL literal a propósito: una migración es
una fotografía del esquema y no debe cambiar si cambian las constantes de la aplicación.

Revision ID: 3295e857da8d
Revises:
Create Date: 2026-10-25 17:00:00+00:00
"""

import uuid
from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "3295e857da8d"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EXTENSIONS_SCHEMA = "extensions"
EXTENSIONS = ("btree_gist", "unaccent")

TABLES_WITH_UPDATED_AT = (
    "roles",
    "users",
    "teachers",
    "career_types",
    "careers",
    "hourly_rates",
    "subjects",
    "assignments",
    "schedules",
    "logbook_entries",
)

IMMUTABLE_TABLES = ("payroll_receipts", "payroll_receipt_lines")

FUNCTIONS_SQL = (
    # subtype_diff le permite a GiST estimar distancias entre rangos (documentación de
    # PostgreSQL, «Defining New Range Types»). El float8 es solo para el índice.
    """
    CREATE FUNCTION time_subtype_diff(x time, y time) RETURNS float8
        LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
        RETURN EXTRACT(EPOCH FROM (x - y))::float8
    """,
    "CREATE TYPE timerange AS RANGE (subtype = time, subtype_diff = time_subtype_diff)",
    # unaccent() es STABLE porque depende del diccionario configurado; con el diccionario
    # explícito y calificado el resultado es fijo, y la función puede declararse IMMUTABLE
    # (requisito de las columnas generadas).
    r"""
    CREATE FUNCTION normalize_name(value text) RETURNS text
        LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
        RETURN lower(regexp_replace(
            btrim(extensions.unaccent('extensions.unaccent'::regdictionary, value)),
            '\s+', ' ', 'g'
        ))
    """,
    """
    CREATE FUNCTION fn_set_updated_at() RETURNS trigger
        LANGUAGE plpgsql AS $$
    BEGIN
        NEW.updated_at := now();
        RETURN NEW;
    END;
    $$
    """,
    # Rechaza la operación con el mensaje que recibe como argumento. Usa el código SQLSTATE
    # 23000 y el nombre del trigger como «constraint», igual que una restricción normal.
    """
    CREATE FUNCTION fn_reject_change() RETURNS trigger
        LANGUAGE plpgsql AS $$
    BEGIN
        RAISE EXCEPTION '%', TG_ARGV[0]
            USING ERRCODE = 'integrity_constraint_violation', CONSTRAINT = TG_NAME;
    END;
    $$
    """,
    # RN-23: una sesión no se crea, edita ni borra si su fecha (antes o después del cambio)
    # cae en un periodo con recibo emitido del mismo docente.
    """
    CREATE FUNCTION fn_logbook_entries_period_locked() RETURNS trigger
        LANGUAGE plpgsql AS $$
    BEGIN
        IF (TG_OP <> 'INSERT' AND EXISTS (
                SELECT 1 FROM payroll_receipts AS r
                WHERE r.teacher_id = OLD.teacher_id
                  AND OLD.session_date BETWEEN r.period_start AND r.period_end))
           OR (TG_OP <> 'DELETE' AND EXISTS (
                SELECT 1 FROM payroll_receipts AS r
                WHERE r.teacher_id = NEW.teacher_id
                  AND NEW.session_date BETWEEN r.period_start AND r.period_end))
        THEN
            RAISE EXCEPTION 'La sesión pertenece a un periodo con recibo emitido.'
                USING ERRCODE = 'integrity_constraint_violation', CONSTRAINT = TG_NAME,
                      HINT = 'La bitácora de un periodo emitido no se puede modificar.';
        END IF;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END;
    $$
    """,
)

DROP_FUNCTIONS_SQL = (
    "DROP FUNCTION fn_logbook_entries_period_locked()",
    "DROP FUNCTION fn_reject_change()",
    "DROP FUNCTION fn_set_updated_at()",
    "DROP FUNCTION normalize_name(text)",
    "DROP TYPE timerange",
    "DROP FUNCTION time_subtype_diff(time, time)",
)

TRIGGERS_SQL = (
    *(
        f"""
        CREATE TRIGGER trg_{table}_set_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION fn_set_updated_at()
        """
        for table in TABLES_WITH_UPDATED_AT
    ),
    *(
        f"""
        CREATE TRIGGER trg_{table}_immutable
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION fn_reject_change('El recibo emitido no se puede modificar ni borrar.')
        """
        for table in IMMUTABLE_TABLES
    ),
    """
    CREATE TRIGGER trg_hourly_rates_amount_immutable
        BEFORE UPDATE OF amount ON hourly_rates
        FOR EACH ROW WHEN (OLD.amount IS DISTINCT FROM NEW.amount)
        EXECUTE FUNCTION fn_reject_change(
            'El importe de una tarifa no se modifica: desactívala y crea una nueva.'
        )
    """,
    """
    CREATE TRIGGER trg_logbook_entries_period_locked
        BEFORE INSERT OR UPDATE OR DELETE ON logbook_entries
        FOR EACH ROW
        EXECUTE FUNCTION fn_logbook_entries_period_locked()
    """,
)

FOLIO_SEQUENCE = "payroll_receipts_folio_number_seq"


def _id() -> sa.Column[int]:
    return sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False)


def _public_id() -> sa.Column[uuid.UUID]:
    return sa.Column(
        "public_id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
    )


def _timestamp(name: str) -> sa.Column[datetime]:
    return sa.Column(
        name, sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


def _is_active() -> sa.Column[bool]:
    return sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False)


def _no_overlap(table: str, day_column: str) -> postgresql.ExcludeConstraint:
    return postgresql.ExcludeConstraint(
        (sa.column("teacher_id"), "="),
        (sa.column(day_column), "="),
        (sa.text("timerange(start_time, end_time, '[)')"), "&&"),
        using="gist",
        name=f"ex_{table}_no_overlap",
    )


def _trimmed(table: str, column: str) -> sa.CheckConstraint:
    return sa.CheckConstraint(
        f"{column} = btrim({column}) AND {column} <> ''", name=op.f(f"ck_{table}_{column}_trimmed")
    )


def _whole_minute(table: str, column: str) -> sa.CheckConstraint:
    return sa.CheckConstraint(
        f"extract(second FROM {column}) = 0", name=op.f(f"ck_{table}_{column}_whole_minute")
    )


def _create_catalogs() -> None:
    op.create_table(
        "roles",
        _id(),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        _is_active(),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint("code ~ '^[a-z][a-z_]*$'", name=op.f("ck_roles_code_format")),
        _trimmed("roles", "name"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roles")),
        sa.UniqueConstraint("code", name=op.f("uq_roles_code")),
        sa.UniqueConstraint("name", name=op.f("uq_roles_name")),
        comment="Catálogo de roles de usuario.",
    )
    op.create_table(
        "career_types",
        _id(),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint("code ~ '^[a-z][a-z_]*$'", name=op.f("ck_career_types_code_format")),
        _trimmed("career_types", "name"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_career_types")),
        sa.UniqueConstraint("code", name=op.f("uq_career_types_code")),
        sa.UniqueConstraint("name", name=op.f("uq_career_types_name")),
        comment="Catálogo de tipos de carrera (ingeniería, licenciatura).",
    )
    op.create_table(
        "careers",
        _id(),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("career_type_id", sa.BigInteger(), nullable=False),
        _is_active(),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint("code ~ '^[A-Z][A-Z0-9]*$'", name=op.f("ck_careers_code_format")),
        _trimmed("careers", "name"),
        sa.ForeignKeyConstraint(
            ["career_type_id"],
            ["career_types.id"],
            name=op.f("fk_careers_career_type_id_career_types"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_careers")),
        sa.UniqueConstraint("code", name=op.f("uq_careers_code")),
        sa.UniqueConstraint("name", name=op.f("uq_careers_name")),
        comment="Catálogo de carreras del TESH.",
    )
    op.create_index(op.f("ix_careers_career_type_id"), "careers", ["career_type_id"])
    op.create_table(
        "hourly_rates",
        _id(),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
        _is_active(),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint("amount > 0", name=op.f("ck_hourly_rates_amount_positive")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_hourly_rates")),
        sa.UniqueConstraint("amount", name=op.f("uq_hourly_rates_amount")),
        comment="Catálogo de tarifas por hora en MXN; el importe es inmutable.",
    )


def _create_identity() -> None:
    op.create_table(
        "users",
        _id(),
        _public_id(),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        _is_active(),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint("email = lower(btrim(email))", name=op.f("ck_users_email_normalized")),
        sa.CheckConstraint(r"email ~ '^[^@\s]+@[^@\s]+$'", name=op.f("ck_users_email_format")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
        sa.UniqueConstraint("public_id", name=op.f("uq_users_public_id")),
        comment="Cuentas de acceso: identidad y credenciales.",
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        _timestamp("created_at"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_user_roles_user_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["roles.id"], name=op.f("fk_user_roles_role_id_roles"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("user_id", "role_id", name=op.f("pk_user_roles")),
        comment="Roles otorgados a cada usuario (relación N:M).",
    )
    op.create_index(op.f("ix_user_roles_role_id"), "user_roles", ["role_id"])
    op.create_table(
        "teachers",
        _id(),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("first_names", sa.String(length=100), nullable=False),
        sa.Column("paternal_surname", sa.String(length=100), nullable=False),
        sa.Column("maternal_surname", sa.String(length=100), nullable=True),
        sa.Column("employee_number", sa.String(length=20), nullable=True),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        _trimmed("teachers", "first_names"),
        _trimmed("teachers", "paternal_surname"),
        _trimmed("teachers", "maternal_surname"),
        _trimmed("teachers", "employee_number"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_teachers_user_id_users"), ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_teachers")),
        sa.UniqueConstraint("user_id", name=op.f("uq_teachers_user_id")),
        sa.UniqueConstraint("employee_number", name=op.f("uq_teachers_employee_number")),
        comment="Perfil del docente (1:1 con users).",
    )


def _create_teaching() -> None:
    op.create_table(
        "subjects",
        _id(),
        _public_id(),
        sa.Column("teacher_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=True),
        sa.Column(
            "name_normalized",
            sa.Text(),
            sa.Computed("normalize_name(name)", persisted=True),
            nullable=False,
        ),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        _trimmed("subjects", "name"),
        _trimmed("subjects", "code"),
        sa.ForeignKeyConstraint(
            ["teacher_id"],
            ["teachers.id"],
            name=op.f("fk_subjects_teacher_id_teachers"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_subjects")),
        sa.UniqueConstraint("public_id", name=op.f("uq_subjects_public_id")),
        sa.UniqueConstraint(
            "teacher_id", "name_normalized", name=op.f("uq_subjects_teacher_id_name_normalized")
        ),
        sa.UniqueConstraint("id", "teacher_id", name=op.f("uq_subjects_id_teacher_id")),
        comment="Materias que registra cada docente.",
    )
    op.create_table(
        "assignments",
        _id(),
        _public_id(),
        sa.Column("teacher_id", sa.BigInteger(), nullable=False),
        sa.Column("subject_id", sa.BigInteger(), nullable=False),
        sa.Column("career_id", sa.BigInteger(), nullable=False),
        sa.Column("hourly_rate_id", sa.BigInteger(), nullable=False),
        _is_active(),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.ForeignKeyConstraint(
            ["teacher_id"],
            ["teachers.id"],
            name=op.f("fk_assignments_teacher_id_teachers"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["subject_id", "teacher_id"],
            ["subjects.id", "subjects.teacher_id"],
            name=op.f("fk_assignments_subject_id_teacher_id_subjects"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["career_id"],
            ["careers.id"],
            name=op.f("fk_assignments_career_id_careers"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["hourly_rate_id"],
            ["hourly_rates.id"],
            name=op.f("fk_assignments_hourly_rate_id_hourly_rates"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assignments")),
        sa.UniqueConstraint("public_id", name=op.f("uq_assignments_public_id")),
        sa.UniqueConstraint("id", "teacher_id", name=op.f("uq_assignments_id_teacher_id")),
        comment="Asignación: docente + materia + carrera + tarifa por hora.",
    )
    op.create_index(op.f("ix_assignments_teacher_id"), "assignments", ["teacher_id"])
    op.create_index(
        "ix_assignments_subject_id_teacher_id", "assignments", ["subject_id", "teacher_id"]
    )
    op.create_index(op.f("ix_assignments_career_id"), "assignments", ["career_id"])
    op.create_index(op.f("ix_assignments_hourly_rate_id"), "assignments", ["hourly_rate_id"])
    op.create_index(
        "uq_assignments_active_teacher_subject_career",
        "assignments",
        ["teacher_id", "subject_id", "career_id"],
        unique=True,
        postgresql_where="is_active",
    )
    op.create_table(
        "schedules",
        _id(),
        _public_id(),
        sa.Column("assignment_id", sa.BigInteger(), nullable=False),
        sa.Column("teacher_id", sa.BigInteger(), nullable=False),
        sa.Column("weekday", sa.SmallInteger(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint("weekday BETWEEN 1 AND 7", name=op.f("ck_schedules_weekday_iso")),
        sa.CheckConstraint("end_time > start_time", name=op.f("ck_schedules_end_after_start")),
        _whole_minute("schedules", "start_time"),
        _whole_minute("schedules", "end_time"),
        _no_overlap("schedules", "weekday"),
        sa.ForeignKeyConstraint(
            ["assignment_id", "teacher_id"],
            ["assignments.id", "assignments.teacher_id"],
            name=op.f("fk_schedules_assignment_id_teacher_id_assignments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_schedules")),
        sa.UniqueConstraint("public_id", name=op.f("uq_schedules_public_id")),
        comment="Horario semanal de cada asignación.",
    )
    op.create_index(
        "ix_schedules_assignment_id_teacher_id", "schedules", ["assignment_id", "teacher_id"]
    )
    op.create_table(
        "logbook_entries",
        _id(),
        _public_id(),
        sa.Column("assignment_id", sa.BigInteger(), nullable=False),
        sa.Column("teacher_id", sa.BigInteger(), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint(
            "end_time > start_time", name=op.f("ck_logbook_entries_end_after_start")
        ),
        _whole_minute("logbook_entries", "start_time"),
        _whole_minute("logbook_entries", "end_time"),
        _trimmed("logbook_entries", "notes"),
        _no_overlap("logbook_entries", "session_date"),
        sa.ForeignKeyConstraint(
            ["assignment_id", "teacher_id"],
            ["assignments.id", "assignments.teacher_id"],
            name=op.f("fk_logbook_entries_assignment_id_teacher_id_assignments"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_logbook_entries")),
        sa.UniqueConstraint("public_id", name=op.f("uq_logbook_entries_public_id")),
        comment="Bitácora: sesiones realmente impartidas.",
    )
    op.create_index(
        "ix_logbook_entries_assignment_id_teacher_id",
        "logbook_entries",
        ["assignment_id", "teacher_id"],
    )
    op.create_index(
        "ix_logbook_entries_teacher_id_session_date",
        "logbook_entries",
        ["teacher_id", "session_date"],
    )


def _create_payroll() -> None:
    op.execute(f"CREATE SEQUENCE {FOLIO_SEQUENCE} AS bigint")
    op.create_table(
        "payroll_receipts",
        _id(),
        _public_id(),
        sa.Column("teacher_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "folio_number",
            sa.BigInteger(),
            server_default=sa.text(f"nextval('{FOLIO_SEQUENCE}')"),
            nullable=False,
        ),
        sa.Column("folio", sa.String(length=40), nullable=False),
        sa.Column("year", sa.SmallInteger(), nullable=False),
        sa.Column("month", sa.SmallInteger(), nullable=False),
        sa.Column("fortnight", sa.SmallInteger(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("teacher_full_name", sa.String(length=302), nullable=False),
        sa.Column("teacher_employee_number", sa.String(length=20), nullable=True),
        sa.Column("total_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "total_hours",
            sa.Numeric(precision=8, scale=2),
            sa.Computed("round(total_minutes::numeric / 60, 2)", persisted=True),
            nullable=False,
        ),
        sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        _timestamp("issued_at"),
        sa.CheckConstraint("month BETWEEN 1 AND 12", name=op.f("ck_payroll_receipts_month_range")),
        sa.CheckConstraint("fortnight IN (1, 2)", name=op.f("ck_payroll_receipts_fortnight_valid")),
        sa.CheckConstraint(
            "period_start = make_date(year, month, CASE fortnight WHEN 1 THEN 1 ELSE 16 END)",
            name=op.f("ck_payroll_receipts_period_start_matches"),
        ),
        sa.CheckConstraint(
            "period_end = CASE fortnight WHEN 1 THEN make_date(year, month, 15) "
            "ELSE (make_date(year, month, 1) + interval '1 month' - interval '1 day')::date END",
            name=op.f("ck_payroll_receipts_period_end_matches"),
        ),
        sa.CheckConstraint(
            "folio_number > 0", name=op.f("ck_payroll_receipts_folio_number_positive")
        ),
        _trimmed("payroll_receipts", "folio"),
        _trimmed("payroll_receipts", "teacher_full_name"),
        sa.CheckConstraint(
            "total_minutes > 0", name=op.f("ck_payroll_receipts_total_minutes_positive")
        ),
        sa.CheckConstraint(
            "total_amount > 0", name=op.f("ck_payroll_receipts_total_amount_positive")
        ),
        sa.ForeignKeyConstraint(
            ["teacher_id"],
            ["teachers.id"],
            name=op.f("fk_payroll_receipts_teacher_id_teachers"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payroll_receipts")),
        sa.UniqueConstraint("public_id", name=op.f("uq_payroll_receipts_public_id")),
        sa.UniqueConstraint("folio_number", name=op.f("uq_payroll_receipts_folio_number")),
        sa.UniqueConstraint("folio", name=op.f("uq_payroll_receipts_folio")),
        sa.UniqueConstraint(
            "teacher_id",
            "year",
            "month",
            "fortnight",
            name=op.f("uq_payroll_receipts_teacher_id_year_month_fortnight"),
        ),
        sa.UniqueConstraint("id", "teacher_id", name=op.f("uq_payroll_receipts_id_teacher_id")),
        comment="Recibos de nómina emitidos: copia fija e inmutable.",
    )
    # La secuencia pertenece a la columna: se borra junto con la tabla.
    op.execute(f"ALTER SEQUENCE {FOLIO_SEQUENCE} OWNED BY payroll_receipts.folio_number")
    op.create_table(
        "payroll_receipt_lines",
        _id(),
        sa.Column("receipt_id", sa.BigInteger(), nullable=False),
        sa.Column("teacher_id", sa.BigInteger(), nullable=False),
        sa.Column("assignment_id", sa.BigInteger(), nullable=False),
        sa.Column("subject_name", sa.String(length=150), nullable=False),
        sa.Column("career_name", sa.String(length=150), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column(
            "hours",
            sa.Numeric(precision=8, scale=2),
            sa.Computed("round(minutes::numeric / 60, 2)", persisted=True),
            nullable=False,
        ),
        sa.Column("hourly_rate", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        _trimmed("payroll_receipt_lines", "subject_name"),
        _trimmed("payroll_receipt_lines", "career_name"),
        sa.CheckConstraint("minutes > 0", name=op.f("ck_payroll_receipt_lines_minutes_positive")),
        sa.CheckConstraint(
            "hourly_rate > 0", name=op.f("ck_payroll_receipt_lines_hourly_rate_positive")
        ),
        sa.CheckConstraint(
            "amount = round(minutes * hourly_rate / 60, 2)",
            name=op.f("ck_payroll_receipt_lines_amount_matches_rate"),
        ),
        sa.ForeignKeyConstraint(
            ["receipt_id", "teacher_id"],
            ["payroll_receipts.id", "payroll_receipts.teacher_id"],
            name=op.f("fk_payroll_receipt_lines_receipt_id_teacher_id_payroll_receipts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["assignment_id", "teacher_id"],
            ["assignments.id", "assignments.teacher_id"],
            name=op.f("fk_payroll_receipt_lines_assignment_id_teacher_id_assignments"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payroll_receipt_lines")),
        sa.UniqueConstraint(
            "receipt_id",
            "assignment_id",
            name=op.f("uq_payroll_receipt_lines_receipt_id_assignment_id"),
        ),
        comment="Renglones congelados de cada recibo emitido.",
    )
    op.create_index(
        "ix_payroll_receipt_lines_receipt_id_teacher_id",
        "payroll_receipt_lines",
        ["receipt_id", "teacher_id"],
    )
    op.create_index(
        "ix_payroll_receipt_lines_assignment_id_teacher_id",
        "payroll_receipt_lines",
        ["assignment_id", "teacher_id"],
    )


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {EXTENSIONS_SCHEMA}")
    op.execute(f"COMMENT ON SCHEMA {EXTENSIONS_SCHEMA} IS 'Objetos de extensiones de PostgreSQL.'")
    for extension in EXTENSIONS:
        op.execute(f"CREATE EXTENSION IF NOT EXISTS {extension} SCHEMA {EXTENSIONS_SCHEMA}")
        # Si la extensión ya existía en otro esquema, se mueve: normalize_name() la invoca
        # con el esquema explícito.
        op.execute(f"ALTER EXTENSION {extension} SET SCHEMA {EXTENSIONS_SCHEMA}")
    for statement in FUNCTIONS_SQL:
        op.execute(statement)

    _create_catalogs()
    _create_identity()
    _create_teaching()
    _create_payroll()

    for statement in TRIGGERS_SQL:
        op.execute(statement)


def downgrade() -> None:
    # Los triggers, índices y la secuencia del folio se eliminan junto con su tabla.
    for table in (
        "payroll_receipt_lines",
        "payroll_receipts",
        "logbook_entries",
        "schedules",
        "assignments",
        "subjects",
        "teachers",
        "user_roles",
        "users",
        "hourly_rates",
        "careers",
        "career_types",
        "roles",
    ):
        op.drop_table(table)
    for statement in DROP_FUNCTIONS_SQL:
        op.execute(statement)
    for extension in reversed(EXTENSIONS):
        op.execute(f"DROP EXTENSION IF EXISTS {extension}")
    op.execute(f"DROP SCHEMA IF EXISTS {EXTENSIONS_SCHEMA}")
