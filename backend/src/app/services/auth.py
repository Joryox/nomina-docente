"""Registro, inicio de sesión, renovación y cierre de sesión."""

from app.core.clock import Clock
from app.core.codes import ErrorCode
from app.core.constants import RoleCode, SessionRevocationReason
from app.core.exceptions import AuthenticationError, ConflictError, PermissionDeniedError
from app.core.security.audit import SecurityEvent, email_fingerprint, log_security_event
from app.core.security.password_policy import PUBLISHED_RULES, PasswordPolicy
from app.core.security.passwords import PasswordHasher
from app.models.teacher import Teacher
from app.models.user import User
from app.repositories.errors import ConstraintViolationError
from app.repositories.role import RoleRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, MeResponse, PasswordPolicyResponse, RegisterRequest
from app.services.account import (
    EMPLOYEE_NUMBER_CONSTRAINT,
    EMPLOYEE_NUMBER_TAKEN_MESSAGE,
    build_me_response,
    ensure_password_policy,
)
from app.services.login_throttle import LoginThrottle
from app.services.sessions import (
    ClientContext,
    IssuedSession,
    Principal,
    RefreshTokenReusedError,
    SessionManager,
)

# Mismo mensaje para correo inexistente, contraseña incorrecta, cuenta bloqueada o
# desactivada: la respuesta no revela qué cuentas existen ni su estado.
INVALID_CREDENTIALS_MESSAGE = "Correo o contraseña incorrectos."
EMAIL_TAKEN_MESSAGE = "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo."
PERMISSION_DENIED_MESSAGE = "Tu cuenta no tiene permiso para realizar esta acción."
EMAIL_CONSTRAINT = "uq_users_email"


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        roles: RoleRepository,
        teachers: TeacherRepository,
        sessions: SessionManager,
        hasher: PasswordHasher,
        policy: PasswordPolicy,
        throttle: LoginThrottle,
        unit_of_work: UnitOfWork,
        clock: Clock,
    ) -> None:
        self._users = users
        self._roles = roles
        self._teachers = teachers
        self._sessions = sessions
        self._hasher = hasher
        self._policy = policy
        self._throttle = throttle
        self._unit_of_work = unit_of_work
        self._clock = clock

    def password_policy(self) -> PasswordPolicyResponse:
        return PasswordPolicyResponse(
            min_length=self._policy.min_length,
            max_length=self._policy.max_length,
            rules=list(PUBLISHED_RULES),
        )

    def register(
        self, data: RegisterRequest, client: ClientContext
    ) -> tuple[MeResponse, IssuedSession]:
        """Crea cuenta, perfil de docente, rol ``teacher`` y primera sesión en una sola
        transacción: si cualquier paso falla, no queda nada a medias."""
        personal = [
            data.email,
            data.first_names,
            data.paternal_surname,
            data.maternal_surname or "",
        ]
        ensure_password_policy(self._policy, data.password, personal)
        if self._users.get_by_email(data.email) is not None:
            raise self._email_taken()
        if data.employee_number and self._teachers.get_by_employee_number(data.employee_number):
            raise self._employee_number_taken()
        role = self._roles.get_by_code(RoleCode.TEACHER)
        if role is None or not role.is_active:
            # Falla de instalación, no del usuario: responde 500 y queda en el registro.
            raise RuntimeError(
                "El rol 'teacher' no existe o está inactivo: ejecuta scripts/seed.sh"
            )

        try:
            with self._unit_of_work.transaction():
                user = self._users.add(
                    User(
                        email=data.email,
                        password_hash=self._hasher.hash(data.password),
                        # El registro inicia sesión: cuenta como el primer acceso.
                        last_login_at=self._clock(),
                    )
                )
                user.roles.append(role)
                self._teachers.add(
                    Teacher(
                        user_id=user.id,
                        first_names=data.first_names,
                        paternal_surname=data.paternal_surname,
                        maternal_surname=data.maternal_surname,
                        employee_number=data.employee_number,
                    )
                )
                issued = self._sessions.start(user, client)
        except ConstraintViolationError as error:
            # Dos registros simultáneos con el mismo dato: la base decide y se responde igual.
            if error.constraint == EMAIL_CONSTRAINT:
                raise self._email_taken() from None
            if error.constraint == EMPLOYEE_NUMBER_CONSTRAINT:
                raise self._employee_number_taken() from None
            raise
        log_security_event(
            SecurityEvent.USER_REGISTERED, user_id=str(user.public_id), client_ip=client.ip_address
        )
        return build_me_response(user), issued

    def login(self, data: LoginRequest, client: ClientContext) -> tuple[MeResponse, IssuedSession]:
        fingerprint = email_fingerprint(data.email)
        with self._unit_of_work.transaction():
            user = self._users.get_by_email(data.email, for_update=True)
            failure = self._check_credentials(user, data.password)
            if failure is None and user is not None:
                self._throttle.reset(user)
                user.last_login_at = self._clock()
                issued = self._sessions.start(user, client)
        if failure is not None or user is None:
            log_security_event(
                SecurityEvent.LOGIN_FAILED,
                user_id=str(user.public_id) if user is not None else None,
                email_hash=fingerprint,
                client_ip=client.ip_address,
                reason=failure,
            )
            raise AuthenticationError(
                INVALID_CREDENTIALS_MESSAGE, code=ErrorCode.INVALID_CREDENTIALS
            )
        log_security_event(
            SecurityEvent.LOGIN_SUCCEEDED, user_id=str(user.public_id), client_ip=client.ip_address
        )
        return build_me_response(user), issued

    def refresh(self, raw_refresh_token: str) -> IssuedSession:
        try:
            with self._unit_of_work.transaction():
                user, issued = self._sessions.rotate(raw_refresh_token)
        except RefreshTokenReusedError as error:
            # Alguien presentó un token ya rotado: se revocan todas las sesiones del usuario
            # (el ladrón y la víctima vuelven a iniciar sesión; solo la víctima puede).
            with self._unit_of_work.transaction():
                revoked = self._sessions.revoke_all(
                    error.user, SessionRevocationReason.REFRESH_TOKEN_REUSED
                )
            log_security_event(
                SecurityEvent.REFRESH_TOKEN_REUSED,
                user_id=str(error.user.public_id),
                sessions_revoked=revoked,
            )
            raise AuthenticationError(error.message, code=error.code) from None
        log_security_event(SecurityEvent.SESSION_REFRESHED, user_id=str(user.public_id))
        return issued

    def logout(self, raw_refresh_token: str | None, raw_access_token: str | None) -> None:
        """Revoca la sesión actual. Es idempotente: sin sesión reconocible, no hace nada."""
        with self._unit_of_work.transaction():
            session = None
            if raw_refresh_token:
                session = self._sessions.find_session_by_refresh_token(raw_refresh_token)
            if session is None and raw_access_token:
                try:
                    session = self._sessions.authenticate(raw_access_token).session
                except AuthenticationError:
                    session = None
            if session is not None:
                self._sessions.revoke(session, SessionRevocationReason.LOGOUT)
        if session is not None:
            owner = self._users.get(session.user_id)
            log_security_event(
                SecurityEvent.LOGOUT, user_id=str(owner.public_id) if owner is not None else None
            )

    def logout_all(self, principal: Principal) -> int:
        with self._unit_of_work.transaction():
            revoked = self._sessions.revoke_all(principal.user, SessionRevocationReason.LOGOUT_ALL)
        log_security_event(
            SecurityEvent.LOGOUT_ALL,
            user_id=str(principal.user.public_id),
            sessions_revoked=revoked,
        )
        return revoked

    def authenticate(self, access_token: str) -> Principal:
        return self._sessions.authenticate(access_token)

    def require_roles(self, principal: Principal, roles: frozenset[RoleCode]) -> Principal:
        granted = {role.code for role in principal.user.roles if role.is_active}
        if not granted & roles:
            raise PermissionDeniedError(PERMISSION_DENIED_MESSAGE)
        return principal

    def _check_credentials(self, user: User | None, password: str) -> str | None:
        """Devuelve el motivo del rechazo (solo para el registro de seguridad) o ``None``.

        Siempre se calcula un hash Argon2, exista o no la cuenta y esté o no bloqueada: el
        tiempo de respuesta no delata nada.
        """
        if user is None:
            self._hasher.verify_dummy(password)
            return "unknown_email"
        if self._throttle.is_locked(user):
            self._hasher.verify_dummy(password)
            return "account_locked"
        valid, updated_hash = self._hasher.verify_and_update(password, user.password_hash)
        if not valid:
            if self._throttle.register_failure(user):
                log_security_event(SecurityEvent.ACCOUNT_LOCKED, user_id=str(user.public_id))
            return "wrong_password"
        if not user.is_active:
            return "inactive_account"
        if updated_hash is not None:
            # Rehash transparente: el hash tenía parámetros de Argon2 anteriores.
            user.password_hash = updated_hash
            log_security_event(SecurityEvent.PASSWORD_REHASHED, user_id=str(user.public_id))
        return None

    @staticmethod
    def _email_taken() -> ConflictError:
        return ConflictError(EMAIL_TAKEN_MESSAGE, code=ErrorCode.EMAIL_ALREADY_REGISTERED)

    @staticmethod
    def _employee_number_taken() -> ConflictError:
        return ConflictError(
            EMPLOYEE_NUMBER_TAKEN_MESSAGE, code=ErrorCode.EMPLOYEE_NUMBER_ALREADY_REGISTERED
        )
