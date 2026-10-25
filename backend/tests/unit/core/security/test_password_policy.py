from pathlib import Path

import pytest

from app.core.security.password_policy import (
    PasswordPolicy,
    PasswordRule,
    get_common_passwords,
    load_common_passwords,
)

PERSONAL = ["ana.garcia@tesh.edu.mx", "Ana María", "García", "López"]


@pytest.fixture
def policy() -> PasswordPolicy:
    return PasswordPolicy(min_length=12, common_passwords=get_common_passwords())


def test_strong_password_has_no_violations(policy: PasswordPolicy) -> None:
    assert policy.violations("Cuaderno-Azul-2026", PERSONAL) == []


@pytest.mark.parametrize(
    ("password", "expected"),
    [
        ("Azul-2026", [PasswordRule.MIN_LENGTH]),
        ("x1" * 65, [PasswordRule.MAX_LENGTH]),
        ("cuaderno-azul-sin-numero", [PasswordRule.DIGIT_REQUIRED]),
        ("2026-2027-2028", [PasswordRule.LETTER_REQUIRED]),
        ("azul", [PasswordRule.MIN_LENGTH, PasswordRule.DIGIT_REQUIRED]),
    ],
)
def test_reports_each_broken_rule(
    policy: PasswordPolicy, password: str, expected: list[PasswordRule]
) -> None:
    assert policy.violations(password, PERSONAL) == expected


@pytest.mark.parametrize(
    "password", ["GARCIA-cuaderno-1", "Maria-Cuaderno-2026", "lopez1234567", "x-ana.garcia-1"]
)
def test_rejects_names_and_email_ignoring_case_and_accents(
    policy: PasswordPolicy, password: str
) -> None:
    assert PasswordRule.NO_PERSONAL_DATA in policy.violations(password, PERSONAL)


def test_email_domain_does_not_count_as_personal_data(policy: PasswordPolicy) -> None:
    """«tesh» o «edu» son del dominio de todos, no datos de la persona."""
    assert policy.violations("Tesh-Edu-Cuaderno-26", PERSONAL) == []


def test_short_name_parts_are_ignored(policy: PasswordPolicy) -> None:
    assert policy.violations("Lu-Cuaderno-Azul-26", ["lu@tesh.edu.mx", "Lu"]) == []


@pytest.mark.parametrize("password", ["Password1234", "CONTRASEÑA1234", "Contrasena1234"])
def test_rejects_common_passwords_ignoring_case_and_accents(
    policy: PasswordPolicy, password: str
) -> None:
    assert PasswordRule.NOT_COMMON in policy.violations(password)


def test_new_password_must_differ_from_current(policy: PasswordPolicy) -> None:
    rules = policy.violations("Cuaderno-Azul-2026", current_password="Cuaderno-Azul-2026")

    assert rules == [PasswordRule.NOT_CURRENT]


def test_common_password_file_skips_comments_and_blank_lines(tmp_path: Path) -> None:
    path = tmp_path / "lista.txt"
    path.write_text("# comentario\n\nQwerty123456\n  Contraseña1  \n", encoding="utf-8")

    assert load_common_passwords(path) == frozenset({"qwerty123456", "contrasena1"})


def test_bundled_list_is_loaded() -> None:
    common = get_common_passwords()

    assert "password1234" in common
    assert not any(entry.startswith("#") for entry in common)
