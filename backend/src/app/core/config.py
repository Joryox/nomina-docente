"""Configuración tipada leída de variables de entorno (y de backend/.env)."""

from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, SecretStr, ValidationError, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy import URL

from app.core.constants import DATABASE_DRIVER, JWT_SECRET_MIN_LENGTH

BACKEND_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = BACKEND_DIR / ".env"


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]


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
    jwt_algorithm: str = Field(min_length=1)
    access_token_expire_minutes: int = Field(gt=0)
    auth_cookie_name: str = Field(min_length=1)
    csrf_cookie_name: str = Field(min_length=1)
    auth_cookie_secure: bool

    cors_origins: Annotated[list[str], NoDecode]

    payroll_folio_prefix: str = Field(min_length=1)

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
        variable = str(issue["loc"][0]).upper() if issue["loc"] else "(desconocida)"
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
