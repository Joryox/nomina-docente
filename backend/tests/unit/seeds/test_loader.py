import json
import shutil
from decimal import Decimal
from pathlib import Path

import pytest

from app.seeds.loader import DATA_DIR, SEED_FILES, SeedDataError, load_seed_data


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    """Copia editable de los archivos reales de datos semilla."""
    for name in SEED_FILES:
        shutil.copy(DATA_DIR / f"{name}.json", tmp_path / f"{name}.json")
    return tmp_path


def _edit(data_dir: Path, name: str, records: list[dict[str, object]]) -> None:
    path = data_dir / f"{name}.json"
    content = json.loads(path.read_text(encoding="utf-8"))
    content["records"] = records
    path.write_text(json.dumps(content, ensure_ascii=False), encoding="utf-8")


def _career(code: str, name: str, career_type: str = "engineering") -> dict[str, object]:
    return {"code": code, "name": name, "career_type": career_type, "is_active": True}


def test_official_seed_files_are_valid() -> None:
    data = load_seed_data()

    assert len(data.careers.records) == 7
    assert "TESH" in data.careers.source
    assert [rate.amount for rate in data.hourly_rates.records] == [
        Decimal("125.00"),
        Decimal("135.00"),
        Decimal("145.00"),
    ]


def test_missing_file_is_reported(data_dir: Path) -> None:
    (data_dir / "careers.json").unlink()

    with pytest.raises(SeedDataError, match=r"careers\.json"):
        load_seed_data(data_dir)


def test_invalid_json_is_reported(data_dir: Path) -> None:
    (data_dir / "roles.json").write_text("{ no es json", encoding="utf-8")

    with pytest.raises(SeedDataError, match="no es JSON válido"):
        load_seed_data(data_dir)


def test_numeric_amounts_never_pass_through_float(data_dir: Path) -> None:
    (data_dir / "hourly_rates.json").write_text(
        '{"source": "Prueba", "records": [{"amount": 135.10, "is_active": true}]}',
        encoding="utf-8",
    )

    assert load_seed_data(data_dir).hourly_rates.records[0].amount == Decimal("135.10")


def test_amount_with_more_than_two_decimals_is_rejected(data_dir: Path) -> None:
    _edit(data_dir, "hourly_rates", [{"amount": "125.005", "is_active": True}])

    with pytest.raises(SeedDataError, match=r"hourly_rates\.records\.0\.amount"):
        load_seed_data(data_dir)


def test_repeated_career_code_is_rejected(data_dir: Path) -> None:
    _edit(data_dir, "careers", [_career("ISC", "Uno"), _career("ISC", "Dos")])

    with pytest.raises(SeedDataError, match="careers repite valores de code: ISC"):
        load_seed_data(data_dir)


def test_repeated_amount_is_rejected_even_with_different_scale(data_dir: Path) -> None:
    _edit(
        data_dir,
        "hourly_rates",
        [{"amount": "125.0", "is_active": True}, {"amount": "125.00", "is_active": True}],
    )

    with pytest.raises(SeedDataError, match="hourly_rates repite valores de amount"):
        load_seed_data(data_dir)


def test_unknown_career_type_is_rejected(data_dir: Path) -> None:
    _edit(data_dir, "careers", [_career("BACH", "Bachillerato", career_type="high_school")])

    with pytest.raises(SeedDataError, match="tipos de carrera que no existen: high_school"):
        load_seed_data(data_dir)


@pytest.mark.parametrize(
    "record",
    [
        _career("isc", "Minúsculas"),
        _career("ISC", " Con espacio"),
        {**_career("ISC", "Campo extra"), "color": "azul"},
    ],
)
def test_malformed_career_is_rejected(data_dir: Path, record: dict[str, object]) -> None:
    _edit(data_dir, "careers", [record])

    with pytest.raises(SeedDataError, match=r"careers\.records\.0"):
        load_seed_data(data_dir)
