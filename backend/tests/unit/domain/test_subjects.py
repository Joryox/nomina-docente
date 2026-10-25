import pytest

from app.domain.subjects import format_subject_name


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("bases de datos", "Bases de Datos"),
        ("  bases   de    datos ", "Bases de Datos"),
        ("BASES DE DATOS", "Bases de Datos"),
        ("cálculo diferencial", "Cálculo Diferencial"),
        ("cálculo ii", "Cálculo II"),
        ("taller de investigación i", "Taller de Investigación I"),
        ("fundamentos de investigación", "Fundamentos de Investigación"),
        ("taller de ética y valores", "Taller de Ética y Valores"),
        ("de la teoría a la práctica", "De la Teoría a la Práctica"),
        ("programación en JavaScript", "Programación en JavaScript"),
        ("TIC", "TIC"),
        ("Gestión de proyectos", "Gestión de Proyectos"),
    ],
)
def test_formats_subject_names_consistently(raw: str, expected: str) -> None:
    assert format_subject_name(raw) == expected


def test_is_idempotent() -> None:
    once = format_subject_name("administración de proyectos ii")

    assert format_subject_name(once) == once
