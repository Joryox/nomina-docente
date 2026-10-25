"""Lectura y validación de los archivos de datos semilla."""

import json
from decimal import Decimal
from pathlib import Path

from pydantic import ValidationError

from app.seeds.schemas import SeedData

DATA_DIR = Path(__file__).resolve().parent / "data"
SEED_FILES = ("roles", "career_types", "careers", "hourly_rates")


class SeedDataError(ValueError):
    """Un archivo de datos semilla falta, no es JSON válido o no cumple su formato."""


def load_seed_data(data_dir: Path = DATA_DIR) -> SeedData:
    content = {name: _read_json(data_dir / f"{name}.json") for name in SEED_FILES}
    try:
        return SeedData.model_validate(content)
    except ValidationError as error:
        raise SeedDataError(_describe(error)) from None


def _read_json(path: Path) -> object:
    try:
        # parse_float=Decimal: un importe escrito como número no pasa nunca por float.
        return json.loads(path.read_text(encoding="utf-8"), parse_float=Decimal)
    except FileNotFoundError:
        raise SeedDataError(f"No existe el archivo de datos semilla {path}.") from None
    except json.JSONDecodeError as error:
        raise SeedDataError(f"{path} no es JSON válido: {error}") from None


def _describe(error: ValidationError) -> str:
    problems = [
        f"  - {'.'.join(str(part) for part in issue['loc']) or '(raíz)'}: {issue['msg']}"
        for issue in error.errors()
    ]
    return "\n".join(["Los datos semilla no son válidos:", *problems])
