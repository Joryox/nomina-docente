import uuid
from datetime import datetime
from typing import cast

from sqlalchemy import CursorResult, update

from app.core.constants import SessionRevocationReason
from app.models.auth_session import AuthSession
from app.repositories.base import BaseRepository


class AuthSessionRepository(BaseRepository[AuthSession]):
    model = AuthSession

    def get_by_public_id(self, public_id: uuid.UUID) -> AuthSession | None:
        return self._find_one(AuthSession.public_id == public_id)

    def revoke_active_for_user(
        self,
        user_id: int,
        *,
        revoked_at: datetime,
        reason: SessionRevocationReason,
        keep_session_id: int | None = None,
    ) -> int:
        """Revoca las sesiones vigentes del usuario (salvo ``keep_session_id``) y devuelve
        cuántas revocó."""
        statement = (
            update(AuthSession)
            .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=revoked_at, revocation_reason=reason.value)
            .execution_options(synchronize_session="fetch")
        )
        if keep_session_id is not None:
            statement = statement.where(AuthSession.id != keep_session_id)
        result = cast(CursorResult[tuple[()]], self._session.execute(statement))
        return result.rowcount
