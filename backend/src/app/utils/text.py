"""Normalización de textos capturados por las personas."""

import re

from email_validator import EmailNotValidError, validate_email

_SPACES = re.compile(r"\s+")


def collapse_spaces(value: str) -> str:
    """Quita espacios al inicio y al final y deja uno solo entre palabras."""
    return _SPACES.sub(" ", value).strip()


def normalize_email(value: str) -> str:
    """RN-02: el correo se compara y se guarda sin espacios y en minúsculas.

    Valida la forma de la dirección (sin consultar DNS) y lanza ``ValueError`` con un
    mensaje en español si no es válida.
    """
    candidate = value.strip().lower()
    try:
        validate_email(candidate, check_deliverability=False)
    except EmailNotValidError:
        raise ValueError(
            "Escribe un correo electrónico válido, por ejemplo nombre@tesh.edu.mx."
        ) from None
    return candidate
