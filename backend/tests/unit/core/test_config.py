from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import ConfigurationError, Settings, describe_validation_error, get_settings


def build_settings(values: dict[str, Any]) -> Settings:
    return Settings(_env_file=None, **values)


def test_builds_settings_from_complete_values(valid_settings_values: dict[str, Any]) -> None:
    settings = build_settings(valid_settings_values)

    assert settings.app_env == "test"
    assert settings.institution_name == "Tecnológico de Estudios Superiores de Huixquilucan"


def test_splits_cors_origins_by_comma(valid_settings_values: dict[str, Any]) -> None:
    valid_settings_values["cors_origins"] = "http://localhost:3000, http://127.0.0.1:3000 ,"

    settings = build_settings(valid_settings_values)

    assert settings.cors_origins == ["http://localhost:3000", "http://127.0.0.1:3000"]


def test_database_urls_use_psycopg_and_escape_password(
    valid_settings_values: dict[str, Any],
) -> None:
    valid_settings_values["db_password"] = "p@ss:w/rd"

    settings = build_settings(valid_settings_values)

    url = settings.database_url
    assert url.drivername == "postgresql+psycopg"
    assert url.password == "p@ss:w/rd"
    assert "p%40ss%3Aw%2Frd" in url.render_as_string(hide_password=False)
    assert settings.test_database_url.database == "nomina_docente_test"


def test_hides_secrets_in_repr(valid_settings_values: dict[str, Any]) -> None:
    settings = build_settings(valid_settings_values)

    assert "contraseña-de-prueba" not in repr(settings)
    assert valid_settings_values["jwt_secret"] not in repr(settings)


def test_rejects_short_jwt_secret(valid_settings_values: dict[str, Any]) -> None:
    valid_settings_values["jwt_secret"] = "corto"

    with pytest.raises(ValidationError) as error:
        build_settings(valid_settings_values)

    assert "JWT_SECRET" in describe_validation_error(error.value)


def test_names_every_missing_variable(valid_settings_values: dict[str, Any]) -> None:
    del valid_settings_values["db_password"]
    del valid_settings_values["institution_name"]

    with pytest.raises(ValidationError) as error:
        build_settings(valid_settings_values)

    message = describe_validation_error(error.value)
    assert "DB_PASSWORD: falta la variable" in message
    assert "INSTITUTION_NAME: falta la variable" in message


def test_get_settings_fails_with_clear_message_when_environment_is_incomplete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for variable in ("DB_PASSWORD", "JWT_SECRET"):
        monkeypatch.delenv(variable, raising=False)
    get_settings.cache_clear()

    try:
        with pytest.raises(ConfigurationError, match="JWT_SECRET: falta la variable"):
            get_settings()
    finally:
        get_settings.cache_clear()


def test_reads_values_from_environment_variables(
    valid_settings_values: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PAYROLL_FOLIO_PREFIX", "REC")
    del valid_settings_values["payroll_folio_prefix"]

    settings = build_settings(valid_settings_values)

    assert settings.payroll_folio_prefix == "REC"


def test_production_requires_secure_cookies(valid_settings_values: dict[str, Any]) -> None:
    valid_settings_values |= {"app_env": "production", "auth_cookie_secure": False}

    with pytest.raises(ValidationError) as error:
        build_settings(valid_settings_values)

    assert "AUTH_COOKIE_SECURE debe ser true" in describe_validation_error(error.value)


def test_cookie_names_must_be_distinct(valid_settings_values: dict[str, Any]) -> None:
    valid_settings_values["refresh_cookie_name"] = valid_settings_values["access_cookie_name"]

    with pytest.raises(ValidationError, match="deben ser distintos"):
        build_settings(valid_settings_values)


@pytest.mark.parametrize(
    ("variable", "value"),
    [("jwt_algorithm", "none"), ("auth_cookie_samesite", "none"), ("password_min_length", 6)],
)
def test_rejects_insecure_values(
    valid_settings_values: dict[str, Any], variable: str, value: object
) -> None:
    valid_settings_values[variable] = value

    with pytest.raises(ValidationError) as error:
        build_settings(valid_settings_values)

    assert variable.upper() in describe_validation_error(error.value)
