"""Política de contraseñas, única para todo el sistema.

El servicio la aplica al registrar y al cambiar la contraseña, y la API la publica
(``GET /auth/password-policy``) para que el frontend muestre los mismos requisitos sin
duplicarlos. La lista de contraseñas comunes vive en ``data/common-passwords.txt``.
"""

import re
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum
from functools import lru_cache
from pathlib import Path

from app.core.constants import PASSWORD_MAX_LENGTH, PASSWORD_PERSONAL_DATA_MIN_LENGTH

COMMON_PASSWORDS_FILE = Path(__file__).resolve().parent / "data" / "common-passwords.txt"

_LETTER = re.compile(r"[^\W\d_]")
_DIGIT = re.compile(r"\d")
_PERSONAL_DATA_SEPARATORS = re.compile(r"[\s@._+\-']+")


class PasswordRule(StrEnum):
    """Código estable de cada requisito; el frontend lo traduce a un texto en español."""

    MIN_LENGTH = "min_length"
    MAX_LENGTH = "max_length"
    LETTER_REQUIRED = "letter_required"
    DIGIT_REQUIRED = "digit_required"
    NO_PERSONAL_DATA = "no_personal_data"
    NOT_COMMON = "not_common"
    # Solo al cambiar la contraseña: la nueva no puede ser igual a la actual.
    NOT_CURRENT = "not_current"


# Requisitos que se publican para el frontend (los que aplican a cualquier contraseña nueva).
PUBLISHED_RULES: tuple[PasswordRule, ...] = (
    PasswordRule.MIN_LENGTH,
    PasswordRule.MAX_LENGTH,
    PasswordRule.LETTER_REQUIRED,
    PasswordRule.DIGIT_REQUIRED,
    PasswordRule.NO_PERSONAL_DATA,
    PasswordRule.NOT_COMMON,
)


def _fold(value: str) -> str:
    """Minúsculas y sin acentos, para comparar como lo haría una persona."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def load_common_passwords(path: Path = COMMON_PASSWORDS_FILE) -> frozenset[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    return frozenset(
        _fold(line.strip()) for line in lines if line.strip() and not line.startswith("#")
    )


@dataclass(frozen=True)
class PasswordPolicy:
    min_length: int
    common_passwords: frozenset[str]
    max_length: int = PASSWORD_MAX_LENGTH

    def violations(
        self,
        password: str,
        personal_data: Iterable[str] = (),
        current_password: str | None = None,
    ) -> list[PasswordRule]:
        """Lista los requisitos que no cumple ``password`` (vacía si es aceptable).

        ``personal_data`` son el correo y los nombres de la persona: la contraseña no puede
        contener ninguna de sus partes (de al menos tres caracteres).
        """
        broken: list[PasswordRule] = []
        if len(password) < self.min_length:
            broken.append(PasswordRule.MIN_LENGTH)
        if len(password) > self.max_length:
            broken.append(PasswordRule.MAX_LENGTH)
        if not _LETTER.search(password):
            broken.append(PasswordRule.LETTER_REQUIRED)
        if not _DIGIT.search(password):
            broken.append(PasswordRule.DIGIT_REQUIRED)
        folded = _fold(password)
        if any(part in folded for part in _personal_parts(personal_data)):
            broken.append(PasswordRule.NO_PERSONAL_DATA)
        if folded in self.common_passwords:
            broken.append(PasswordRule.NOT_COMMON)
        if current_password is not None and password == current_password:
            broken.append(PasswordRule.NOT_CURRENT)
        return broken


def _personal_parts(personal_data: Iterable[str]) -> set[str]:
    parts: set[str] = set()
    for value in personal_data:
        # Del correo solo cuenta la parte local: el dominio (tesh.edu.mx) es de todos.
        folded = _fold(value).split("@", 1)[0]
        candidates = [folded, *_PERSONAL_DATA_SEPARATORS.split(folded)]
        parts.update(part for part in candidates if len(part) >= PASSWORD_PERSONAL_DATA_MIN_LENGTH)
    return parts


@lru_cache
def get_common_passwords() -> frozenset[str]:
    return load_common_passwords()
