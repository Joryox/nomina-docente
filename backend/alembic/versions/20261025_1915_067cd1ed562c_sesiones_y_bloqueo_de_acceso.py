"""Sesiones, refresh tokens y bloqueo de acceso.

1. ``users``: contador de intentos fallidos (``failed_login_attempts``, no negativo) y fin
   del bloqueo temporal (``locked_until``) contra fuerza bruta.
2. ``auth_sessions``: una fila por sesión iniciada (familia de refresh tokens), con su
   vigencia, motivo de revocación y trigger de ``updated_at``.
3. ``refresh_tokens``: solo el hash SHA-256 de cada token, con un índice único parcial que
   garantiza un único token sin usar por sesión (invariante de la rotación).

Escrita a partir de autogenerate y revisada a mano: autogenerate no agrega ``CHECK`` a una
tabla existente ni crea triggers.

Revision ID: 067cd1ed562c
Revises: 3295e857da8d
Create Date: 2026-10-25 19:15:00+00:00
"""

import uuid
from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "067cd1ed562c"
down_revision: str | Sequence[str] | None = "3295e857da8d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _id() -> sa.Column[int]:
    return sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False)


def _timestamp(name: str) -> sa.Column[datetime]:
    return sa.Column(
        name, sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


def _public_id() -> sa.Column[uuid.UUID]:
    return sa.Column(
        "public_id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False
    )


def _add_lockout_to_users() -> None:
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        op.f("ck_users_failed_login_attempts_non_negative"),
        "users",
        "failed_login_attempts >= 0",
    )


def _create_auth_sessions() -> None:
    op.create_table(
        "auth_sessions",
        _id(),
        _public_id(),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revocation_reason", sa.String(length=30), nullable=True),
        _timestamp("created_at"),
        _timestamp("updated_at"),
        sa.CheckConstraint(
            "expires_at > created_at", name=op.f("ck_auth_sessions_expires_after_creation")
        ),
        sa.CheckConstraint(
            "(revoked_at IS NULL) = (revocation_reason IS NULL)",
            name=op.f("ck_auth_sessions_revocation_consistent"),
        ),
        sa.CheckConstraint(
            "revocation_reason IS NULL OR revocation_reason IN "
            "('logout', 'logout_all', 'password_changed', 'refresh_token_reused')",
            name=op.f("ck_auth_sessions_revocation_reason_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("public_id", name=op.f("uq_auth_sessions_public_id")),
        comment="Sesiones iniciadas (familias de refresh tokens).",
    )
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"])
    # Misma función de trigger que las demás tablas (migración inicial).
    op.execute(
        """
        CREATE TRIGGER trg_auth_sessions_set_updated_at
            BEFORE UPDATE ON auth_sessions
            FOR EACH ROW
            EXECUTE FUNCTION fn_set_updated_at()
        """
    )


def _create_refresh_tokens() -> None:
    op.create_table(
        "refresh_tokens",
        _id(),
        sa.Column("session_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        _timestamp("created_at"),
        sa.CheckConstraint(
            "token_hash ~ '^[0-9a-f]{64}$'", name=op.f("ck_refresh_tokens_token_hash_format")
        ),
        sa.CheckConstraint(
            "expires_at > created_at", name=op.f("ck_refresh_tokens_expires_after_creation")
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["auth_sessions.id"],
            name=op.f("fk_refresh_tokens_session_id_auth_sessions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_tokens_token_hash")),
        comment="Refresh tokens (solo su hash), con rotación en cada uso.",
    )
    op.create_index(op.f("ix_refresh_tokens_session_id"), "refresh_tokens", ["session_id"])
    op.create_index(
        "uq_refresh_tokens_session_id_unused",
        "refresh_tokens",
        ["session_id"],
        unique=True,
        postgresql_where=sa.text("used_at IS NULL"),
    )


def upgrade() -> None:
    _add_lockout_to_users()
    _create_auth_sessions()
    _create_refresh_tokens()


def downgrade() -> None:
    # Los índices y el trigger se eliminan junto con su tabla.
    op.drop_table("refresh_tokens")
    op.drop_table("auth_sessions")
    op.drop_constraint(op.f("ck_users_failed_login_attempts_non_negative"), "users", type_="check")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")
