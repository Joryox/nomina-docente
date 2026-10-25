"""Carga idempotente de catálogos: inserta lo nuevo y actualiza lo que cambió en los archivos.

Cada registro se identifica por su llave natural (``code`` o ``amount``). Un registro que
desaparece del archivo **no** se borra: para retirarlo se marca ``is_active: false``, igual
que la baja lógica del sistema (RN-07, RN-12). La función no confirma la transacción.
"""

from collections import Counter
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum

from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.career import Career
from app.models.career_type import CareerType
from app.models.hourly_rate import HourlyRate
from app.models.role import Role
from app.repositories.base import BaseRepository
from app.repositories.career import CareerRepository
from app.repositories.career_type import CareerTypeRepository
from app.repositories.hourly_rate import HourlyRateRepository
from app.repositories.role import RoleRepository
from app.seeds.loader import load_seed_data
from app.seeds.schemas import SeedData


class SeedOutcome(StrEnum):
    INSERTED = "inserted"
    UPDATED = "updated"
    UNCHANGED = "unchanged"


@dataclass
class CatalogReport:
    catalog: str
    counts: Counter[SeedOutcome] = field(default_factory=Counter)

    def record(self, outcome: SeedOutcome) -> None:
        self.counts[outcome] += 1


def run_seeds(session: Session, data: SeedData | None = None) -> list[CatalogReport]:
    data = data or load_seed_data()
    reports = [
        _seed_roles(session, data),
        _seed_career_types(session, data),
        _seed_careers(session, data),
        _seed_hourly_rates(session, data),
    ]
    session.flush()
    return reports


def _sync[ModelT: Base](
    repository: BaseRepository[ModelT], existing: ModelT | None, values: Mapping[str, object]
) -> SeedOutcome:
    if existing is None:
        repository.add(repository.model(**values))
        return SeedOutcome.INSERTED
    changed = {name: value for name, value in values.items() if getattr(existing, name) != value}
    for name, value in changed.items():
        setattr(existing, name, value)
    return SeedOutcome.UPDATED if changed else SeedOutcome.UNCHANGED


def _seed_roles(session: Session, data: SeedData) -> CatalogReport:
    repository = RoleRepository(session)
    report = CatalogReport(Role.__tablename__)
    for record in data.roles.records:
        report.record(_sync(repository, repository.get_by_code(record.code), record.model_dump()))
    return report


def _seed_career_types(session: Session, data: SeedData) -> CatalogReport:
    repository = CareerTypeRepository(session)
    report = CatalogReport(CareerType.__tablename__)
    for record in data.career_types.records:
        report.record(_sync(repository, repository.get_by_code(record.code), record.model_dump()))
    return report


def _seed_careers(session: Session, data: SeedData) -> CatalogReport:
    repository = CareerRepository(session)
    career_types = CareerTypeRepository(session)
    report = CatalogReport(Career.__tablename__)
    for record in data.careers.records:
        career_type = career_types.get_by_code(record.career_type)
        if career_type is None:  # SeedData ya valida la referencia; esto protege el tipo.
            raise LookupError(f"No existe el tipo de carrera {record.career_type}.")
        values = record.model_dump(exclude={"career_type"}) | {"career_type_id": career_type.id}
        report.record(_sync(repository, repository.get_by_code(record.code), values))
    return report


def _seed_hourly_rates(session: Session, data: SeedData) -> CatalogReport:
    repository = HourlyRateRepository(session)
    report = CatalogReport(HourlyRate.__tablename__)
    for record in data.hourly_rates.records:
        existing = repository.get_by_amount(record.amount)
        report.record(_sync(repository, existing, record.model_dump()))
    return report
