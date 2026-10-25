from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Career, HourlyRate, Role
from app.repositories.career import CareerRepository
from app.repositories.role import RoleRepository
from app.seeds.loader import load_seed_data
from app.seeds.runner import SeedOutcome, run_seeds
from app.seeds.schemas import CareerSeed, SeedData

pytestmark = pytest.mark.db

TESH_CAREERS = {
    "ICIV": "Ingeniería Civil",
    "IIND": "Ingeniería Industrial",
    "IMEC": "Ingeniería Mecatrónica",
    "ISC": "Ingeniería en Sistemas Computacionales",
    "LADM": "Licenciatura en Administración",
    "LBIO": "Licenciatura en Biología",
    "LGAS": "Licenciatura en Gastronomía",
}


def _with_careers(data: SeedData, records: list[CareerSeed]) -> SeedData:
    return data.model_copy(update={"careers": data.careers.model_copy(update={"records": records})})


def _count(session: Session, model: type[Career | HourlyRate | Role]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_loads_the_official_catalogs(seeded_session: Session) -> None:
    careers = seeded_session.scalars(select(Career)).all()

    assert {career.code: career.name for career in careers} == TESH_CAREERS
    assert {career.code: career.career_type.code for career in careers}["LGAS"] == "bachelor"
    assert sorted(seeded_session.scalars(select(HourlyRate.amount))) == [
        Decimal("125.00"),
        Decimal("135.00"),
        Decimal("145.00"),
    ]
    admin = RoleRepository(seeded_session).get_by_code("admin")
    assert admin is not None
    assert admin.is_active is False


def test_running_twice_changes_nothing(seeded_session: Session) -> None:
    counts = {model: _count(seeded_session, model) for model in (Career, HourlyRate, Role)}

    reports = run_seeds(seeded_session)

    assert all(set(report.counts) == {SeedOutcome.UNCHANGED} for report in reports)
    assert {model: _count(seeded_session, model) for model in counts} == counts


def test_new_record_in_the_file_is_inserted(seeded_session: Session) -> None:
    """El catálogo crece editando solo el archivo de datos."""
    data = load_seed_data()
    law = CareerSeed(
        code="LDER", name="Licenciatura en Derecho", career_type="bachelor", is_active=True
    )

    reports = run_seeds(seeded_session, _with_careers(data, [*data.careers.records, law]))

    careers_report = next(report for report in reports if report.catalog == "careers")
    assert careers_report.counts[SeedOutcome.INSERTED] == 1
    assert CareerRepository(seeded_session).get_by_code("LDER") is not None


def test_changed_record_in_the_file_is_updated(seeded_session: Session) -> None:
    data = load_seed_data()
    records = [
        record.model_copy(update={"is_active": False}) if record.code == "LGAS" else record
        for record in data.careers.records
    ]

    reports = run_seeds(seeded_session, _with_careers(data, records))

    careers_report = next(report for report in reports if report.catalog == "careers")
    assert careers_report.counts[SeedOutcome.UPDATED] == 1
    gastronomy = CareerRepository(seeded_session).get_by_code("LGAS")
    assert gastronomy is not None
    assert gastronomy.is_active is False


def test_record_removed_from_the_file_is_kept(seeded_session: Session) -> None:
    """Las semillas nunca borran: la baja es lógica (RN-07)."""
    data = load_seed_data()
    records = [record for record in data.careers.records if record.code != "LBIO"]

    run_seeds(seeded_session, _with_careers(data, records))

    assert CareerRepository(seeded_session).get_by_code("LBIO") is not None
