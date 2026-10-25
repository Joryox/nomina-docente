"""Cookies de sesión y CSRF. Es la única pieza que traduce tokens a cabeceras HTTP.

| Cookie            | HttpOnly | Path               | Vida                      |
| ----------------- | -------- | ------------------ | ------------------------- |
| acceso (JWT)      | sí       | ``/``              | ACCESS_TOKEN_EXPIRE_MINUTES |
| refresh (opaco)   | sí       | ``/api/v1/auth``   | REFRESH_TOKEN_EXPIRE_DAYS |
| indicador         | sí       | ``/``              | igual que el refresh      |
| CSRF              | **no**   | ``/``              | igual que el refresh      |

Todas con ``Secure`` (AUTH_COOKIE_SECURE) y ``SameSite`` (AUTH_COOKIE_SAMESITE). El
indicador no es una credencial: solo le dice al proxy de Next.js que hay una sesión para
decidir redirecciones; la autorización real siempre la hace el backend.
"""

from datetime import timedelta

from fastapi import Response

from app.core.config import Settings
from app.core.constants import REFRESH_COOKIE_PATH, SESSION_COOKIE_PATH, SESSION_HINT_COOKIE_VALUE
from app.core.security.tokens import IssuedToken, new_opaque_token
from app.services.sessions import IssuedSession


def _seconds(lifetime: timedelta) -> int:
    return int(lifetime.total_seconds())


def _set(
    response: Response,
    settings: Settings,
    *,
    name: str,
    value: str,
    max_age: int,
    path: str = SESSION_COOKIE_PATH,
    http_only: bool = True,
) -> None:
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        path=path,
        secure=settings.auth_cookie_secure,
        httponly=http_only,
        samesite=settings.auth_cookie_samesite,
    )


def _delete(response: Response, settings: Settings, name: str, path: str) -> None:
    response.delete_cookie(
        key=name,
        path=path,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )


def refresh_lifetime(settings: Settings) -> timedelta:
    return timedelta(days=settings.refresh_token_expire_days)


def set_session_cookies(response: Response, settings: Settings, issued: IssuedSession) -> None:
    access: IssuedToken = issued.access_token
    _set(
        response,
        settings,
        name=settings.access_cookie_name,
        value=access.value,
        max_age=_seconds(timedelta(minutes=settings.access_token_expire_minutes)),
    )
    _set(
        response,
        settings,
        name=settings.refresh_cookie_name,
        value=issued.refresh_token.value,
        max_age=_seconds(refresh_lifetime(settings)),
        path=REFRESH_COOKIE_PATH,
    )
    _set(
        response,
        settings,
        name=settings.session_hint_cookie_name,
        value=SESSION_HINT_COOKIE_VALUE,
        max_age=_seconds(refresh_lifetime(settings)),
    )


def clear_session_cookies(response: Response, settings: Settings) -> None:
    _delete(response, settings, settings.access_cookie_name, SESSION_COOKIE_PATH)
    _delete(response, settings, settings.refresh_cookie_name, REFRESH_COOKIE_PATH)
    _delete(response, settings, settings.session_hint_cookie_name, SESSION_COOKIE_PATH)


def issue_csrf_cookie(response: Response, settings: Settings) -> str:
    """Emite un token CSRF nuevo. Se renueva al iniciar y al cerrar sesión, para que un
    token obtenido antes del inicio de sesión no siga sirviendo después."""
    token = new_opaque_token()
    _set(
        response,
        settings,
        name=settings.csrf_cookie_name,
        value=token,
        max_age=_seconds(refresh_lifetime(settings)),
        http_only=False,  # El frontend la lee para copiarla en el encabezado X-CSRF-Token.
    )
    return token
