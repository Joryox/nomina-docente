"""Composición de dependencias: arma servicios con sus repositorios para los routers.

Es el único punto de la capa API que conoce sesiones y repositorios; los routers solo
reciben servicios ya construidos.

**Regla de acceso (RN-04):** toda ruta de negocio declara ``CurrentTeacher`` (o
``CurrentUser`` / ``require_roles``) y pasa ese objeto al servicio; el servicio filtra
siempre por ese docente. Ninguna ruta acepta el identificador del docente desde la
petición, así que un docente nunca puede leer ni modificar datos de otro.
"""

from collections.abc import Callable
from datetime import timedelta
from ipaddress import ip_address
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.clock import Clock, utc_now
from app.core.config import Settings, get_settings
from app.core.constants import USER_AGENT_MAX_LENGTH, RoleCode
from app.core.exceptions import AuthenticationError
from app.core.security.password_policy import PasswordPolicy, get_common_passwords
from app.core.security.passwords import PasswordHasher, get_password_hasher
from app.core.security.tokens import AccessTokenCodec
from app.db.session import get_db
from app.models.teacher import Teacher
from app.repositories.auth_session import AuthSessionRepository
from app.repositories.health import HealthRepository
from app.repositories.refresh_token import RefreshTokenRepository
from app.repositories.role import RoleRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.repositories.user import UserRepository
from app.services.account import AccountService
from app.services.auth import AuthService
from app.services.health import HealthService
from app.services.login_throttle import LoginThrottle
from app.services.sessions import ClientContext, Principal, SessionLifetimes, SessionManager

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_clock() -> Clock:
    return utc_now


AppClock = Annotated[Clock, Depends(get_clock)]
Hasher = Annotated[PasswordHasher, Depends(get_password_hasher)]


def get_health_service(session: DbSession, settings: AppSettings) -> HealthService:
    return HealthService(HealthRepository(session), settings)


def get_password_policy(settings: AppSettings) -> PasswordPolicy:
    return PasswordPolicy(
        min_length=settings.password_min_length, common_passwords=get_common_passwords()
    )


Policy = Annotated[PasswordPolicy, Depends(get_password_policy)]


def get_login_throttle(settings: AppSettings, clock: AppClock) -> LoginThrottle:
    return LoginThrottle(
        max_failed_attempts=settings.login_max_failed_attempts,
        lockout=timedelta(minutes=settings.login_lockout_minutes),
        clock=clock,
    )


Throttle = Annotated[LoginThrottle, Depends(get_login_throttle)]


def get_session_manager(
    session: DbSession, settings: AppSettings, clock: AppClock
) -> SessionManager:
    return SessionManager(
        users=UserRepository(session),
        sessions=AuthSessionRepository(session),
        refresh_tokens=RefreshTokenRepository(session),
        codec=AccessTokenCodec(
            secret=settings.jwt_secret.get_secret_value(),
            algorithm=settings.jwt_algorithm,
            lifetime=timedelta(minutes=settings.access_token_expire_minutes),
        ),
        lifetimes=SessionLifetimes(
            access=timedelta(minutes=settings.access_token_expire_minutes),
            refresh=timedelta(days=settings.refresh_token_expire_days),
            reuse_grace=timedelta(seconds=settings.refresh_token_reuse_grace_seconds),
        ),
        clock=clock,
    )


Sessions = Annotated[SessionManager, Depends(get_session_manager)]


def get_auth_service(
    session: DbSession,
    sessions: Sessions,
    hasher: Hasher,
    policy: Policy,
    throttle: Throttle,
    clock: AppClock,
) -> AuthService:
    return AuthService(
        users=UserRepository(session),
        roles=RoleRepository(session),
        teachers=TeacherRepository(session),
        sessions=sessions,
        hasher=hasher,
        policy=policy,
        throttle=throttle,
        unit_of_work=UnitOfWork(session),
        clock=clock,
    )


def get_account_service(
    session: DbSession, sessions: Sessions, hasher: Hasher, policy: Policy, throttle: Throttle
) -> AccountService:
    return AccountService(
        teachers=TeacherRepository(session),
        sessions=sessions,
        hasher=hasher,
        policy=policy,
        throttle=throttle,
        unit_of_work=UnitOfWork(session),
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]


def _valid_ip(host: str | None) -> str | None:
    """La dirección del cliente solo se guarda si es una IP válida (columna ``inet``)."""
    if host is None:
        return None
    try:
        return str(ip_address(host))
    except ValueError:
        return None


def get_client_context(request: Request) -> ClientContext:
    user_agent = request.headers.get("user-agent")
    return ClientContext(
        ip_address=_valid_ip(request.client.host if request.client else None),
        user_agent=user_agent[:USER_AGENT_MAX_LENGTH] if user_agent else None,
    )


Client = Annotated[ClientContext, Depends(get_client_context)]


def get_current_user(request: Request, settings: AppSettings, service: AuthServiceDep) -> Principal:
    """Cuenta autenticada por la cookie de acceso; 401 si no hay sesión vigente."""
    token = request.cookies.get(settings.access_cookie_name)
    if not token:
        raise AuthenticationError()
    return service.authenticate(token)


CurrentUser = Annotated[Principal, Depends(get_current_user)]


def get_current_teacher(principal: CurrentUser, service: AccountServiceDep) -> Teacher:
    """Perfil de docente de la cuenta autenticada; 403 si la cuenta no es de un docente."""
    return service.require_teacher(principal)


CurrentTeacher = Annotated[Teacher, Depends(get_current_teacher)]


def require_roles(*roles: RoleCode) -> Callable[[Principal, AuthService], Principal]:
    """Dependencia que exige al menos uno de ``roles``; 403 si la cuenta no lo tiene.

    Uso: ``principal: Annotated[Principal, Depends(require_roles(RoleCode.ADMIN))]``.
    """
    required = frozenset(roles)

    def dependency(principal: CurrentUser, service: AuthServiceDep) -> Principal:
        return service.require_roles(principal, required)

    return dependency
