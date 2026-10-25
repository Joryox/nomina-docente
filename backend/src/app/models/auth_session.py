from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import (
    SESSION_REVOCATION_REASON_MAX_LENGTH,
    USER_AGENT_MAX_LENGTH,
    SessionRevocationReason,
)
from app.db.base import Base
from app.db.mixins import IdentityPkMixin, PublicIdMixin, TimestampMixin

_REASONS = ", ".join(f"'{reason.value}'" for reason in SessionRevocationReason)


class AuthSession(IdentityPkMixin, PublicIdMixin, TimestampMixin, Base):
    """Sesión iniciada en un dispositivo: la «familia» de sus refresh tokens.

    El JWT de acceso lleva el ``public_id`` de la sesión (``sid``); cada petición comprueba
    que siga vigente, así que revocarla corta el acceso de inmediato.
    """

    __tablename__ = "auth_sessions"
    __table_args__ = (
        CheckConstraint("expires_at > created_at", name="expires_after_creation"),
        # Una sesión revocada siempre dice por qué, y una vigente no tiene motivo.
        CheckConstraint(
            "(revoked_at IS NULL) = (revocation_reason IS NULL)", name="revocation_consistent"
        ),
        CheckConstraint(
            f"revocation_reason IS NULL OR revocation_reason IN ({_REASONS})",
            name="revocation_reason_valid",
        ),
        {"comment": "Sesiones iniciadas (familias de refresh tokens)."},
    )

    # La sesión no tiene valor histórico sin la cuenta: se borra con ella.
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user_agent: Mapped[str | None] = mapped_column(String(USER_AGENT_MAX_LENGTH))
    ip_address: Mapped[str | None] = mapped_column(INET)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocation_reason: Mapped[str | None] = mapped_column(
        String(SESSION_REVOCATION_REASON_MAX_LENGTH)
    )
