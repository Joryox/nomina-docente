import pytest

from app.utils.text import collapse_spaces, normalize_email


def test_collapse_spaces() -> None:
    assert collapse_spaces("  Ana \t  María ") == "Ana María"


def test_normalize_email() -> None:
    """RN-02: sin espacios y en minúsculas."""
    assert normalize_email("  Ana.Garcia@TESH.edu.MX ") == "ana.garcia@tesh.edu.mx"


@pytest.mark.parametrize("value", ["sin-arroba", "ana@", "ana garcia@tesh.edu.mx", "@tesh.edu.mx"])
def test_invalid_email(value: str) -> None:
    with pytest.raises(ValueError, match="correo electrónico válido"):
        normalize_email(value)
