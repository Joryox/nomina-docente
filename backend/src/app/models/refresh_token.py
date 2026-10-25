from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import TOKEN_HASH_HEX_LENGTH
from app.db.base import Base
from app.db.mixins import CreatedAtMixin, IdentityPkMixin


class RefreshToken(IdentityPkMixin, CreatedAtMixin, Base):
    """Refresh token de una sesión. Solo se guarda su hash SHA-256, nunca el valor.

    Cada uso lo rota: se marca ``used_at`` y se emite uno nuevo en la misma sesión. Si un
    token ya usado vuelve a presentarse, alguien lo copió: se revocan las sesiones.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        CheckConstraint(
            f"token_hash ~ '^[0-9a-f]{{{TOKEN_HASH_HEX_LENGTH}}}$'", name="token_hash_format"
        ),
        CheckConstraint("expires_at > created_at", name="expires_after_creation"),
        # Invariante de la rotación: cada sesión tiene a lo más un token sin usar.
        Index(
            "uq_refresh_tokens_session_id_unused",
            "session_id",
            unique=True,
            postgresql_where=text("used_at IS NULL"),
        ),
        {"comment": "Refresh tokens (solo su hash), con rotación en cada uso."},
    )

    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("auth_sessions.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(TOKEN_HASH_HEX_LENGTH), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
