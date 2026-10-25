"""Cuenta del usuario autenticado: datos propios, perfil y cambio de contraseña.

Todas las operaciones actúan sobre el ``Principal`` de la petición: un docente solo puede
leer y modificar su propia cuenta (RN-04).
"""

from collections.abc import Iterable

from app.core.codes import ErrorCode
from app.core.constants import SessionRevocationReason
from app.core.exceptions import BusinessRuleError, ConflictError, DomainError, PermissionDeniedError
from app.core.security.audit import SecurityEvent, log_security_event
from app.core.security.password_policy import PasswordPolicy
from app.core.security.passwords import PasswordHasher
from app.models.teacher import Teacher
from app.models.user import User
from app.repositories.errors import ConstraintViolationError
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.auth import (
    AccountResponse,
    ChangePasswordRequest,
    MeResponse,
    TeacherProfileResponse,
    UpdateProfileRequest,
)
from app.services.login_throttle import LoginThrottle
from app.services.sessions import Principal, SessionManager

EMPLOYEE_NUMBER_TAKEN_MESSAGE = (
    "Ese número de empleado ya está registrado en otra cuenta. Revísalo o déjalo en blanco."
)
TEACHER_PROFILE_REQUIRED_MESSAGE = "Esta cuenta no tiene un perfil de docente."
EMPLOYEE_NUMBER_CONSTRAINT = "uq_teachers_employee_number"


def full_name(teacher: Teacher) -> str:
    parts = (teacher.first_names, teacher.paternal_surname, teacher.maternal_surname)
    return " ".join(part for part in parts if part)


def build_me_response(user: User) -> MeResponse:
    teacher = user.teacher
    return MeResponse(
        account=AccountResponse(
            id=user.public_id,
            email=user.email,
            roles=sorted(role.code for role in user.roles if role.is_active),
            last_login_at=user.last_login_at,
            created_at=user.created_at,
        ),
        teacher=None
        if teacher is None
        else TeacherProfileResponse(
            first_names=teacher.first_names,
            paternal_surname=teacher.paternal_surname,
            maternal_surname=teacher.maternal_surname,
            employee_number=teacher.employee_number,
            full_name=full_name(teacher),
        ),
    )


def personal_data(user: User, teacher: Teacher | None) -> list[str]:
    """Datos de la persona que no pueden aparecer dentro de su contraseña."""
    values = [user.email]
    if teacher is not None:
        values += [teacher.first_names, teacher.paternal_surname, teacher.maternal_surname or ""]
    return values


def ensure_password_policy(
    policy: PasswordPolicy,
    password: str,
    personal: Iterable[str],
    current_password: str | None = None,
) -> None:
    broken = policy.violations(password, personal, current_password)
    if broken:
        raise BusinessRuleError(
            "La contraseña no cumple los requisitos de seguridad.",
            code=ErrorCode.PASSWORD_POLICY_VIOLATION,
            details={"rules": [rule.value for rule in broken]},
        )


class AccountService:
    def __init__(
        self,
        teachers: TeacherRepository,
        sessions: SessionManager,
        hasher: PasswordHasher,
        policy: PasswordPolicy,
        throttle: LoginThrottle,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._teachers = teachers
        self._sessions = sessions
        self._hasher = hasher
        self._policy = policy
        self._throttle = throttle
        self._unit_of_work = unit_of_work

    def get_me(self, principal: Principal) -> MeResponse:
        return build_me_response(principal.user)

    def require_teacher(self, principal: Principal) -> Teacher:
        teacher = principal.user.teacher
        if teacher is None:
            raise PermissionDeniedError(
                TEACHER_PROFILE_REQUIRED_MESSAGE, code=ErrorCode.TEACHER_PROFILE_REQUIRED
            )
        return teacher

    def update_profile(self, principal: Principal, data: UpdateProfileRequest) -> MeResponse:
        teacher = self.require_teacher(principal)
        changes = data.model_dump(include=data.model_fields_set)
        number = changes.get("employee_number")
        if number is not None and number != teacher.employee_number:
            owner = self._teachers.get_by_employee_number(number)
            if owner is not None and owner.id != teacher.id:
                raise self._employee_number_taken()
        try:
            with self._unit_of_work.transaction():
                for field, value in changes.items():
                    setattr(teacher, field, value)
                self._teachers.flush()
        except ConstraintViolationError as error:
            if error.constraint == EMPLOYEE_NUMBER_CONSTRAINT:
                raise self._employee_number_taken() from None
            raise
        log_security_event(SecurityEvent.PROFILE_UPDATED, user_id=str(principal.user.public_id))
        return build_me_response(principal.user)

    def change_password(self, principal: Principal, data: ChangePasswordRequest) -> int:
        """Exige la contraseña actual, aplica la política y revoca las demás sesiones.

        Un error en la contraseña actual cuenta como intento fallido: así una sesión robada
        no sirve para adivinar la contraseña. Devuelve cuántas sesiones se revocaron.
        """
        user = principal.user
        valid = False
        if not self._throttle.is_locked(user):
            valid, _ = self._hasher.verify_and_update(data.current_password, user.password_hash)
        if not valid:
            with self._unit_of_work.transaction():
                if not self._throttle.is_locked(user):
                    self._throttle.register_failure(user)
            log_security_event(
                SecurityEvent.PASSWORD_CHANGE_FAILED,
                user_id=str(user.public_id),
                reason="current_password_incorrect",
            )
            raise DomainError(
                "La contraseña actual no es correcta.",
                code=ErrorCode.CURRENT_PASSWORD_INCORRECT,
            )
        ensure_password_policy(
            self._policy,
            data.new_password,
            personal_data(user, user.teacher),
            current_password=data.current_password,
        )
        with self._unit_of_work.transaction():
            user.password_hash = self._hasher.hash(data.new_password)
            self._throttle.reset(user)
            revoked = self._sessions.revoke_all(
                user, SessionRevocationReason.PASSWORD_CHANGED, keep=principal.session
            )
        log_security_event(
            SecurityEvent.PASSWORD_CHANGED, user_id=str(user.public_id), sessions_revoked=revoked
        )
        return revoked

    @staticmethod
    def _employee_number_taken() -> ConflictError:
        return ConflictError(
            EMPLOYEE_NUMBER_TAKEN_MESSAGE, code=ErrorCode.EMPLOYEE_NUMBER_ALREADY_REGISTERED
        )
