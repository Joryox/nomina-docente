"""Sesiones: emisión, validación, rotación de refresh tokens y revocación.

No conoce HTTP: recibe y devuelve valores de tokens; el router los pone en cookies.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.core.clock import Clock
from app.core.codes import ErrorCode
from app.core.constants import SessionRevocationReason
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security.tokens import (
    AccessTokenClaims,
    AccessTokenCodec,
    ExpiredTokenError,
    InvalidTokenError,
    IssuedToken,
    hash_opaque_token,
    new_opaque_token,
)
from app.models.auth_session import AuthSession
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.repositories.user import UserRepository

SESSION_EXPIRED_MESSAGE = "Tu sesión terminó. Inicia sesión de nuevo."


@dataclass(frozen=True)
class ClientContext:
    """Datos del cliente que se guardan con la sesión (para auditoría)."""

    ip_address: str | None
    user_agent: str | None


@dataclass(frozen=True)
class IssuedSession:
    access_token: IssuedToken
    refresh_token: IssuedToken


@dataclass(frozen=True)
class Principal:
    """Quién hace la petición: la cuenta autenticada y la sesión con la que entró."""

    user: User
    session: AuthSession


@dataclass(frozen=True)
class SessionLifetimes:
    access: timedelta
    refresh: timedelta
    reuse_grace: timedelta


class RefreshTokenReusedError(AuthenticationError):
    """Se presentó un refresh token ya rotado fuera de la tolerancia: posible robo.

    Quien la atrape revoca las sesiones del usuario en una transacción propia: la de la
    renovación se revierte al propagarse la excepción.
    """

    def __init__(self, user: User) -> None:
        super().__init__(SESSION_EXPIRED_MESSAGE, code=ErrorCode.SESSION_INVALID)
        self.user = user


def _session_invalid() -> AuthenticationError:
    return AuthenticationError(SESSION_EXPIRED_MESSAGE, code=ErrorCode.SESSION_INVALID)


class SessionManager:
    def __init__(
        self,
        users: UserRepository,
        sessions: AuthSessionRepository,
        refresh_tokens: RefreshTokenRepository,
        codec: AccessTokenCodec,
        lifetimes: SessionLifetimes,
        clock: Clock,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._refresh_tokens = refresh_tokens
        self._codec = codec
        self._lifetimes = lifetimes
        self._clock = clock

    def start(self, user: User, client: ClientContext) -> IssuedSession:
        now = self._clock()
        session = self._sessions.add(
            AuthSession(
                user_id=user.id,
                user_agent=client.user_agent,
                ip_address=client.ip_address,
                last_used_at=now,
                expires_at=now + self._lifetimes.refresh,
                created_at=now,
            )
        )
        return self._issue(user, session, now)

    def authenticate(self, access_token: str) -> Principal:
        try:
            claims = self._codec.decode(access_token)
        except ExpiredTokenError:
            raise AuthenticationError(
                SESSION_EXPIRED_MESSAGE, code=ErrorCode.ACCESS_TOKEN_EXPIRED
            ) from None
        except InvalidTokenError:
            raise _session_invalid() from None
        session = self._sessions.get_by_public_id(claims.session_public_id)
        if session is None or not self._is_active(session, self._clock()):
            raise _session_invalid()
        user = self._users.get(session.user_id)
        if user is None or user.public_id != claims.user_public_id or not user.is_active:
            raise _session_invalid()
        return Principal(user=user, session=session)

    def rotate(self, raw_refresh_token: str) -> tuple[User, IssuedSession]:
        """Cambia un refresh token vigente por uno nuevo (y un access token nuevo).

        - Token desconocido, expirado o de una sesión revocada: sesión inválida.
        - Token ya usado dentro de la tolerancia: otra pestaña lo acaba de rotar; se rechaza
          con conflicto sin revocar nada (las cookies nuevas ya están en el navegador).
        - Token ya usado fuera de la tolerancia: reuso (``RefreshTokenReusedError``).
        """
        now = self._clock()
        token = self._refresh_tokens.get_by_hash_for_update(hash_opaque_token(raw_refresh_token))
        if token is None:
            raise _session_invalid()
        session = self._sessions.get(token.session_id)
        user = self._users.get(session.user_id) if session is not None else None
        if session is None or user is None or not self._is_active(session, now):
            raise _session_invalid()
        if token.used_at is not None:
            if now - token.used_at <= self._lifetimes.reuse_grace:
                raise ConflictError(
                    "La sesión se acaba de renovar en otra pestaña.",
                    code=ErrorCode.SESSION_REFRESH_CONFLICT,
                )
            raise RefreshTokenReusedError(user)
        if token.expires_at <= now or not user.is_active:
            raise _session_invalid()

        token.used_at = now
        # El token viejo debe quedar marcado antes de insertar el nuevo: el índice único
        # parcial admite un solo token sin usar por sesión.
        self._refresh_tokens.flush()
        session.last_used_at = now
        session.expires_at = now + self._lifetimes.refresh
        return user, self._issue(user, session, now)

    def find_session_by_refresh_token(self, raw_refresh_token: str) -> AuthSession | None:
        token = self._refresh_tokens.get_by_hash_for_update(hash_opaque_token(raw_refresh_token))
        return self._sessions.get(token.session_id) if token is not None else None

    def revoke(self, session: AuthSession, reason: SessionRevocationReason) -> None:
        if session.revoked_at is None:
            session.revoked_at = self._clock()
            session.revocation_reason = reason.value
            self._sessions.flush()

    def revoke_all(
        self,
        user: User,
        reason: SessionRevocationReason,
        keep: AuthSession | None = None,
    ) -> int:
        return self._sessions.revoke_active_for_user(
            user.id,
            revoked_at=self._clock(),
            reason=reason,
            keep_session_id=keep.id if keep is not None else None,
        )

    def _issue(self, user: User, session: AuthSession, now: datetime) -> IssuedSession:
        raw_refresh = new_opaque_token()
        refresh_expires_at = now + self._lifetimes.refresh
        self._refresh_tokens.add(
            RefreshToken(
                session_id=session.id,
                token_hash=hash_opaque_token(raw_refresh),
                expires_at=refresh_expires_at,
                created_at=now,
            )
        )
        access = self._codec.encode(
            AccessTokenClaims(user_public_id=user.public_id, session_public_id=session.public_id),
            now,
        )
        return IssuedSession(
            access_token=access, refresh_token=IssuedToken(raw_refresh, refresh_expires_at)
        )

    @staticmethod
    def _is_active(session: AuthSession, now: datetime) -> bool:
        return session.revoked_at is None and session.expires_at > now
