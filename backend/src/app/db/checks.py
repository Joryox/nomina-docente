"""Expresiones SQL reutilizables para restricciones ``CHECK``."""

from app.core.constants import GROUP_CODE_PATTERN


def trimmed_not_blank(column: str) -> str:
    """El texto no está vacío ni tiene espacios al inicio o al final."""
    return f"{column} = btrim({column}) AND {column} <> ''"


def whole_minute(column: str) -> str:
    """La hora no tiene segundos: las horas trabajadas se calculan en minutos enteros."""
    return f"extract(second FROM {column}) = 0"


def group_code_format(column: str) -> str:
    """Clave de grupo normalizada (mayúsculas, dígitos y guiones), o nula."""
    return f"{column} ~ '{GROUP_CODE_PATTERN}'"
