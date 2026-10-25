"""Bloqueo temporal de la cuenta tras varios intentos fallidos seguidos (fuerza bruta).

El estado vive en ``users`` (``failed_login_attempts``, ``locked_until``), así que el
bloqueo se mantiene aunque el servidor se reinicie y aplica a cualquier instancia.
"""

from datetime import timedelta

from app.core.clock import Clock
from app.models.user import User


class LoginThrottle:
    def __init__(self, max_failed_attempts: int, lockout: timedelta, clock: Clock) -> None:
        self._max_failed_attempts = max_failed_attempts
        self._lockout = lockout
        self._clock = clock

    def is_locked(self, user: User) -> bool:
        return user.locked_until is not None and user.locked_until > self._clock()

    def register_failure(self, user: User) -> bool:
        """Cuenta un intento fallido; al llegar al máximo bloquea la cuenta y reinicia la
        cuenta de intentos. Devuelve ``True`` si este intento provocó el bloqueo."""
        user.failed_login_attempts += 1
        if user.failed_login_attempts < self._max_failed_attempts:
            return False
        user.failed_login_attempts = 0
        user.locked_until = self._clock() + self._lockout
        return True

    def reset(self, user: User) -> None:
        user.failed_login_attempts = 0
        user.locked_until = None
