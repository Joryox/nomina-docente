"""Registro de eventos de seguridad (logger ``app.security``).

Solo acepta campos con nombre y tipos simples: no hay forma de pasarle una contraseña, un
token o un cuerpo de petición por descuido. El correo nunca se escribe en claro; se usa su
huella (``email_fingerprint``) para relacionar intentos repetidos sobre la misma cuenta.
"""

import hashlib
import logging
from enum import StrEnum

from app.core.constants import EMAIL_FINGERPRINT_LENGTH

logger = logging.getLogger("app.security")


class SecurityEvent(StrEnum):
    USER_REGISTERED = "user_registered"
    LOGIN_SUCCEEDED = "login_succeeded"
    LOGIN_FAILED = "login_failed"
    ACCOUNT_LOCKED = "account_locked"
    PASSWORD_REHASHED = "password_rehashed"
    SESSION_REFRESHED = "session_refreshed"
    REFRESH_TOKEN_REUSED = "refresh_token_reused"
    LOGOUT = "logout"
    LOGOUT_ALL = "logout_all"
    PASSWORD_CHANGED = "password_changed"
    PROFILE_UPDATED = "profile_updated"


_WARNING_EVENTS = frozenset(
    {SecurityEvent.LOGIN_FAILED, SecurityEvent.ACCOUNT_LOCKED, SecurityEvent.REFRESH_TOKEN_REUSED}
)


def email_fingerprint(email: str) -> str:
    return hashlib.sha256(email.encode()).hexdigest()[:EMAIL_FINGERPRINT_LENGTH]


def log_security_event(
    event: SecurityEvent,
    *,
    user_id: str | None = None,
    email_hash: str | None = None,
    client_ip: str | None = None,
    reason: str | None = None,
    sessions_revoked: int | None = None,
) -> None:
    fields = {
        "security_event": event.value,
        "user_id": user_id,
        "email_hash": email_hash,
        "client_ip": client_ip,
        "reason": reason,
        "sessions_revoked": sessions_revoked,
    }
    level = logging.WARNING if event in _WARNING_EVENTS else logging.INFO
    logger.log(
        level,
        "Evento de seguridad",
        extra={key: value for key, value in fields.items() if value is not None},
    )
