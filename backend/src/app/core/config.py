"""Configuración tipada leída de variables de entorno (y de backend/.env)."""

from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import Field, SecretStr, ValidationError, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy import URL

from app.core.constants import (
    DATABASE_DRIVER,
    JWT_SECRET_MIN_LENGTH,
    MINUTES_PER_DAY,
    PASSWORD_MAX_LENGTH,
)

BACKEND_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = BACKEND_DIR / ".env"


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
# Solo HMAC: así nunca se acepta un token con "alg": "none" ni se confunden claves.
JwtAlgorithm = Literal["HS256", "HS384", "HS512"]
# "none" no se admite: sin SameSite la cookie viajaría en peticiones de otros sitios.
CookieSameSite = Literal["lax", "strict"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    app_env: Environment
    app_name: str = Field(min_length=1)
    api_host: str = Field(min_length=1)
    api_port: int = Field(gt=0, lt=65536)
    log_level: LogLevel

    institution_name: str = Field(min_length=1)
    institution_short_name: str = Field(min_length=1)

    db_host: str = Field(min_length=1)
    db_port: int = Field(gt=0, lt=65536)
    db_user: str = Field(min_length=1)
    db_password: SecretStr
    db_name: str = Field(min_length=1)
    db_name_test: str = Field(min_length=1)

    jwt_secret: SecretStr
    jwt_algorithm: JwtAlgorithm
    access_token_expire_minutes: int = Field(gt=0)
    refresh_token_expire_days: int = Field(gt=0)
    refresh_token_reuse_grace_seconds: int = Field(ge=0)

    access_cookie_name: str = Field(min_length=1)
    refresh_cookie_name: str = Field(min_length=1)
    session_hint_cookie_name: str = Field(min_length=1)
    csrf_cookie_name: str = Field(min_length=1)
    auth_cookie_secure: bool
    auth_cookie_samesite: CookieSameSite

    login_max_failed_attempts: int = Field(gt=0)
    login_lockout_minutes: int = Field(gt=0)
    password_min_length: int = Field(ge=8, le=PASSWORD_MAX_LENGTH)

    max_request_body_bytes: int = Field(gt=0)

    cors_origins: Annotated[list[str], NoDecode]

    payroll_folio_prefix: str = Field(min_length=1)
    # Política institucional (docs/reglas-de-negocio.md): no son constantes porque cada
    # institución puede fijar otros límites sin cambiar código.
    payroll_issue_requires_closed_period: bool
    class_min_duration_minutes: int = Field(gt=0, lt=MINUTES_PER_DAY)
    class_max_duration_minutes: int = Field(gt=0, lt=MINUTES_PER_DAY)
    logbook_max_age_days: int = Field(ge=0)

    @field_validator("jwt_secret")
    @classmethod
    def _validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < JWT_SECRET_MIN_LENGTH:
            raise ValueError(f"debe tener al menos {JWT_SECRET_MIN_LENGTH} caracteres")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def _require_secure_cookies_in_production(self) -> Self:
        if self.app_env is Environment.PRODUCTION and not self.auth_cookie_secure:
            raise ValueError("AUTH_COOKIE_SECURE debe ser true en producción (HTTPS)")
        return self

    @model_validator(mode="after")
    def _require_distinct_cookie_names(self) -> Self:
        names = [
            self.access_cookie_name,
            self.refresh_cookie_name,
            self.session_hint_cookie_name,
            self.csrf_cookie_name,
        ]
        if len(set(names)) != len(names):
            raise ValueError("los nombres de las cookies de sesión y CSRF deben ser distintos")
        return self

    @model_validator(mode="after")
    def _require_coherent_class_durations(self) -> Self:
        if self.class_min_duration_minutes > self.class_max_duration_minutes:
            raise ValueError(
                "CLASS_MIN_DURATION_MINUTES no puede ser mayor que CLASS_MAX_DURATION_MINUTES"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env is Environment.PRODUCTION

    @property
    def database_url(self) -> URL:
        return self._build_database_url(self.db_name)

    @property
    def test_database_url(self) -> URL:
        return self._build_database_url(self.db_name_test)

    def _build_database_url(self, database: str) -> URL:
        return URL.create(
            drivername=DATABASE_DRIVER,
            username=self.db_user,
            password=self.db_password.get_secret_value(),
            host=self.db_host,
            port=self.db_port,
            database=database,
        )


class ConfigurationError(RuntimeError):
    """La configuración del entorno está incompleta o es inválida."""


def describe_validation_error(error: ValidationError) -> str:
    problems: list[str] = []
    for issue in error.errors():
        if not issue["loc"]:
            # Reglas entre variables (model_validator): el mensaje ya nombra cada variable.
            problems.append(f"  - {issue['msg'].removeprefix('Value error, ')}")
            continue
        variable = str(issue["loc"][0]).upper()
        if issue["type"] == "missing":
            problems.append(f"  - {variable}: falta la variable")
        else:
            problems.append(f"  - {variable}: {issue['msg']}")
    header = f"Configuración inválida. Revisa {ENV_FILE} (usa .env.example como guía):"
    return "\n".join([header, *problems])


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as error:
        raise ConfigurationError(describe_validation_error(error)) from None
