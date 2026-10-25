"""Tokens de sesión: JWT de acceso, refresh token opaco y token CSRF."""

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

import jwt

from app.core.constants import ACCESS_TOKEN_TYPE, JWT_AUDIENCE, JWT_ISSUER, OPAQUE_TOKEN_BYTES

_REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub", "sid", "typ"]


class InvalidTokenError(Exception):
    """El token no es válido: firma, formato, emisor, audiencia o tipo incorrectos."""


class ExpiredTokenError(InvalidTokenError):
    """El token era válido pero ya expiró."""


@dataclass(frozen=True)
class AccessTokenClaims:
    user_public_id: uuid.UUID
    session_public_id: uuid.UUID


@dataclass(frozen=True)
class IssuedToken:
    value: str
    expires_at: datetime


class AccessTokenCodec:
    """Firma y valida el JWT de acceso. ``sid`` liga el token a una sesión de la base, de
    modo que revocar la sesión invalida el token de inmediato."""

    def __init__(self, secret: str, algorithm: str, lifetime: timedelta) -> None:
        self._secret = secret
        self._algorithm = algorithm
        self._lifetime = lifetime

    def encode(self, claims: AccessTokenClaims, now: datetime) -> IssuedToken:
        expires_at = now + self._lifetime
        payload = {
            "iss": JWT_ISSUER,
            "aud": JWT_AUDIENCE,
            "sub": str(claims.user_public_id),
            "sid": str(claims.session_public_id),
            "typ": ACCESS_TOKEN_TYPE,
            "iat": now,
            "exp": expires_at,
        }
        return IssuedToken(jwt.encode(payload, self._secret, algorithm=self._algorithm), expires_at)

    def decode(self, token: str) -> AccessTokenClaims:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                audience=JWT_AUDIENCE,
                issuer=JWT_ISSUER,
                options={"require": _REQUIRED_CLAIMS},
            )
        except jwt.ExpiredSignatureError as error:
            raise ExpiredTokenError from error
        except jwt.PyJWTError as error:
            raise InvalidTokenError from error
        if payload["typ"] != ACCESS_TOKEN_TYPE:
            raise InvalidTokenError
        try:
            return AccessTokenClaims(uuid.UUID(payload["sub"]), uuid.UUID(payload["sid"]))
        except (TypeError, ValueError) as error:
            raise InvalidTokenError from error


def new_opaque_token() -> str:
    """Valor aleatorio de 256 bits, apto para URL y cookies."""
    return secrets.token_urlsafe(OPAQUE_TOKEN_BYTES)


def hash_opaque_token(token: str) -> str:
    """SHA-256 del refresh token. Basta un hash rápido sin sal: el token tiene 256 bits
    aleatorios y no se puede adivinar por fuerza bruta (a diferencia de una contraseña)."""
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_match(expected: str, received: str) -> bool:
    """Comparación en tiempo constante (no revela cuántos caracteres coinciden)."""
    return hmac.compare_digest(expected.encode(), received.encode())
