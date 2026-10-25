"""Contratos de la API de autenticación y cuenta.

Todos los modelos de entrada rechazan campos desconocidos (``extra="forbid"``). Las
contraseñas nunca se recortan ni se normalizan: un espacio también es un carácter válido.
"""

import uuid
from datetime import datetime
from typing import Annotated, Any, Self

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)

from app.core.constants import (
    EMAIL_MAX_LENGTH,
    EMPLOYEE_NUMBER_MAX_LENGTH,
    EMPLOYEE_NUMBER_PATTERN,
    PASSWORD_MAX_LENGTH,
    PERSON_NAME_MAX_LENGTH,
    PERSON_NAME_PATTERN,
)
from app.core.security.password_policy import PasswordRule
from app.utils.text import collapse_spaces, normalize_email


def _collapse_text(value: Any) -> Any:
    return collapse_spaces(value) if isinstance(value, str) else value


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


Email = Annotated[
    str, StringConstraints(max_length=EMAIL_MAX_LENGTH), AfterValidator(normalize_email)
]
Password = Annotated[str, StringConstraints(min_length=1, max_length=PASSWORD_MAX_LENGTH)]
PersonName = Annotated[
    str,
    BeforeValidator(_collapse_text),
    StringConstraints(min_length=1, max_length=PERSON_NAME_MAX_LENGTH, pattern=PERSON_NAME_PATTERN),
]
EmployeeNumber = Annotated[
    str,
    StringConstraints(max_length=EMPLOYEE_NUMBER_MAX_LENGTH, pattern=EMPLOYEE_NUMBER_PATTERN),
]
OptionalPersonName = Annotated[PersonName | None, BeforeValidator(_blank_to_none)]
OptionalEmployeeNumber = Annotated[EmployeeNumber | None, BeforeValidator(_blank_to_none)]


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterRequest(StrictInput):
    email: Email
    password: Password
    first_names: PersonName
    paternal_surname: PersonName
    maternal_surname: OptionalPersonName = None
    employee_number: OptionalEmployeeNumber = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "email": "ana.garcia@tesh.edu.mx",
                    "password": "Cuaderno-Azul-2026",
                    "first_names": "Ana María",
                    "paternal_surname": "García",
                    "maternal_surname": "López",
                    "employee_number": "TESH-0042",
                }
            ]
        },
    )


class LoginRequest(StrictInput):
    email: Email
    password: Password

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [{"email": "ana.garcia@tesh.edu.mx", "password": "Cuaderno-Azul-2026"}]
        },
    )


class ChangePasswordRequest(StrictInput):
    current_password: Password
    new_password: Password

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {"current_password": "Cuaderno-Azul-2026", "new_password": "Lampara-Verde-2027"}
            ]
        },
    )


class UpdateProfileRequest(StrictInput):
    """Solo se modifican los campos enviados; ``null`` borra un dato opcional."""

    first_names: PersonName | None = None
    paternal_surname: PersonName | None = None
    maternal_surname: OptionalPersonName = None
    employee_number: OptionalEmployeeNumber = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"first_names": "Ana", "employee_number": "TESH-0042"}]},
    )

    @model_validator(mode="after")
    def _validate_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Envía al menos un dato para actualizar.")
        for required in ("first_names", "paternal_surname"):
            if required in self.model_fields_set and getattr(self, required) is None:
                raise ValueError("El nombre y el apellido paterno no pueden quedar vacíos.")
        return self


class AccountResponse(BaseModel):
    id: uuid.UUID = Field(description="Identificador público de la cuenta")
    email: str
    roles: list[str]
    last_login_at: datetime | None
    created_at: datetime


class TeacherProfileResponse(BaseModel):
    first_names: str
    paternal_surname: str
    maternal_surname: str | None
    employee_number: str | None
    full_name: str


class MeResponse(BaseModel):
    account: AccountResponse
    teacher: TeacherProfileResponse | None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "account": {
                        "id": "5f0c7a52-3a0e-4f53-9d4c-2b1a0c9e7d11",
                        "email": "ana.garcia@tesh.edu.mx",
                        "roles": ["teacher"],
                        "last_login_at": "2026-10-25T18:30:00Z",
                        "created_at": "2026-10-20T15:00:00Z",
                    },
                    "teacher": {
                        "first_names": "Ana María",
                        "paternal_surname": "García",
                        "maternal_surname": "López",
                        "employee_number": "TESH-0042",
                        "full_name": "Ana María García López",
                    },
                }
            ]
        }
    )


class PasswordPolicyResponse(BaseModel):
    min_length: int
    max_length: int
    rules: list[PasswordRule] = Field(
        description="Requisitos que aplica el servidor, en el orden en que se muestran"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "min_length": 12,
                    "max_length": 128,
                    "rules": [
                        "min_length",
                        "max_length",
                        "letter_required",
                        "digit_required",
                        "no_personal_data",
                        "not_common",
                    ],
                }
            ]
        }
    )


class CsrfTokenResponse(BaseModel):
    csrf_token: str = Field(description="Copia del valor de la cookie CSRF para el encabezado")
