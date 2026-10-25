"""Formato de los archivos de ``seeds/data/``. Un archivo inválido detiene la carga antes de
tocar la base, con un mensaje que dice qué registro está mal."""

from collections.abc import Hashable
from decimal import Decimal
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.constants import (
    CATALOG_CODE_MAX_LENGTH,
    CATALOG_DESCRIPTION_MAX_LENGTH,
    CATALOG_NAME_MAX_LENGTH,
    HOURLY_RATE_PRECISION,
    MONEY_DECIMAL_PLACES,
)

# Mismas reglas que los CHECK de la base: sin espacios al inicio ni al final.
_TRIMMED_PATTERN = r"^\S(.*\S)?$"

LowercaseCode = Annotated[str, Field(pattern=r"^[a-z][a-z_]*$", max_length=CATALOG_CODE_MAX_LENGTH)]
UppercaseCode = Annotated[
    str, Field(pattern=r"^[A-Z][A-Z0-9]*$", max_length=CATALOG_CODE_MAX_LENGTH)
]
CatalogName = Annotated[str, Field(pattern=_TRIMMED_PATTERN, max_length=CATALOG_NAME_MAX_LENGTH)]


class _SeedRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class RoleSeed(_SeedRecord):
    code: LowercaseCode
    name: CatalogName
    description: (
        Annotated[str, Field(pattern=_TRIMMED_PATTERN, max_length=CATALOG_DESCRIPTION_MAX_LENGTH)]
        | None
    )
    is_active: bool


class CareerTypeSeed(_SeedRecord):
    code: LowercaseCode
    name: CatalogName


class CareerSeed(_SeedRecord):
    code: UppercaseCode
    name: CatalogName
    career_type: LowercaseCode
    is_active: bool


class HourlyRateSeed(_SeedRecord):
    amount: Annotated[
        Decimal,
        Field(gt=0, max_digits=HOURLY_RATE_PRECISION, decimal_places=MONEY_DECIMAL_PLACES),
    ]
    is_active: bool


class SeedFile[RecordT: _SeedRecord](_SeedRecord):
    """Cada archivo declara de dónde salen sus datos y la lista de registros."""

    source: Annotated[str, Field(pattern=_TRIMMED_PATTERN)]
    records: list[RecordT]


class SeedData(_SeedRecord):
    roles: SeedFile[RoleSeed]
    career_types: SeedFile[CareerTypeSeed]
    careers: SeedFile[CareerSeed]
    hourly_rates: SeedFile[HourlyRateSeed]

    @model_validator(mode="after")
    def _validate_consistency(self) -> Self:
        _require_unique("roles", "code", [role.code for role in self.roles.records])
        _require_unique("roles", "name", [role.name for role in self.roles.records])
        type_codes = [career_type.code for career_type in self.career_types.records]
        _require_unique("career_types", "code", type_codes)
        _require_unique(
            "career_types", "name", [career_type.name for career_type in self.career_types.records]
        )
        _require_unique("careers", "code", [career.code for career in self.careers.records])
        _require_unique("careers", "name", [career.name for career in self.careers.records])
        # Decimal compara por valor: 125.0 y 125.00 cuentan como la misma tarifa.
        _require_unique(
            "hourly_rates", "amount", [rate.amount for rate in self.hourly_rates.records]
        )
        unknown = sorted({career.career_type for career in self.careers.records} - set(type_codes))
        if unknown:
            raise ValueError(f"careers usa tipos de carrera que no existen: {', '.join(unknown)}")
        return self


def _require_unique[ValueT: Hashable](file: str, field: str, values: list[ValueT]) -> None:
    repeated = sorted({str(value) for value in values if values.count(value) > 1})
    if repeated:
        raise ValueError(f"{file} repite valores de {field}: {', '.join(repeated)}")
