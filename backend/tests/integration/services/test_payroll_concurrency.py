"""Dos emisiones simultáneas del mismo periodo producen un solo recibo (RN-29, RN-30).

A diferencia del resto de las pruebas, esta confirma transacciones reales: cada hilo usa su
propia conexión, como dos peticiones al servidor. Al terminar se borran los datos creados
(los recibos son inmutables por trigger, así que la limpieza desactiva los triggers dentro
de su propia transacción).
"""

import threading
from collections.abc import Iterator
from datetime import UTC, date, time
from decimal import Decimal
from typing import Any

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.core.clock import BusinessCalendar
from app.core.config import Settings
from app.core.constants import Fortnight
from app.core.exceptions import DomainError
from app.domain.periods import Period
from app.models import Teacher
from app.repositories.career import CareerRepository
from app.repositories.hourly_rate import HourlyRateRepository
from app.repositories.logbook import LogbookRepository
from app.repositories.payroll_receipt import PayrollReceiptRepository
from app.repositories.schedule import ScheduleRepository
from app.repositories.teacher import TeacherRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.payroll import InstitutionResponse
from app.seeds.runner import SeedOutcome, run_seeds
from app.services.payroll import PayrollService
from app.services.policy import BusinessPolicy
from tests.business import BUSINESS_NOW
from tests.factories import build_logbook_entry, create_assignment, create_teacher
from tests.helpers import FakeClock

pytestmark = pytest.mark.db

PERIOD = Period(2026, 10, Fortnight.FIRST)
CLEANUP_SQL = (
    "DELETE FROM payroll_receipt_lines WHERE teacher_id = :teacher",
    "DELETE FROM payroll_receipts WHERE teacher_id = :teacher",
    "DELETE FROM logbook_entries WHERE teacher_id = :teacher",
    "DELETE FROM assignments WHERE teacher_id = :teacher",
    "DELETE FROM subjects WHERE teacher_id = :teacher",
    "DELETE FROM teachers WHERE id = :teacher",
    "DELETE FROM users WHERE id = :user",
)
LOCKED_TABLES = ("payroll_receipt_lines", "payroll_receipts", "logbook_entries")
CATALOG_CLEANUP_SQL = (
    "DELETE FROM careers",
    "DELETE FROM career_types",
    "DELETE FROM hourly_rates",
    "DELETE FROM roles",
)


@pytest.fixture
def committed_teacher(test_engine: Engine) -> Iterator[Teacher]:
    """Docente con una sesión en la 1.ª quincena de octubre, confirmado en la base."""
    with Session(test_engine, expire_on_commit=False) as session:
        reports = run_seeds(session)
        seeded_here = any(report.counts[SeedOutcome.INSERTED] for report in reports)
        teacher = create_teacher(session)
        career = CareerRepository(session).get_by_code("ISC")
        rate = HourlyRateRepository(session).get_by_amount(Decimal("125.00"))
        assert career is not None and rate is not None
        assignment = create_assignment(session, teacher, career, rate)
        session.add(build_logbook_entry(assignment, date(2026, 10, 12), time(7), time(9)))
        session.commit()
    try:
        yield teacher
    finally:
        _cleanup(test_engine, teacher, remove_catalogs=seeded_here)


def _cleanup(engine: Engine, teacher: Teacher, *, remove_catalogs: bool) -> None:
    with engine.begin() as connection:
        for table in LOCKED_TABLES:
            connection.execute(text(f"ALTER TABLE {table} DISABLE TRIGGER USER"))
        for statement in CLEANUP_SQL:
            connection.execute(text(statement), {"teacher": teacher.id, "user": teacher.user_id})
        for table in LOCKED_TABLES:
            connection.execute(text(f"ALTER TABLE {table} ENABLE TRIGGER USER"))
        if remove_catalogs:
            # La base de pruebas no tenía catálogos confirmados: se deja como estaba.
            for statement in CATALOG_CLEANUP_SQL:
                connection.execute(text(statement))


def _service(session: Session, settings: Settings) -> PayrollService:
    return PayrollService(
        logbook=LogbookRepository(session),
        schedules=ScheduleRepository(session),
        receipts=PayrollReceiptRepository(session),
        teachers=TeacherRepository(session),
        unit_of_work=UnitOfWork(session),
        calendar=BusinessCalendar(FakeClock(BUSINESS_NOW.astimezone(UTC))),
        policy=BusinessPolicy.from_settings(settings),
        institution=InstitutionResponse(name="TESH", short_name="TESH"),
        folio_prefix=settings.payroll_folio_prefix,
    )


def test_two_simultaneous_issues_produce_a_single_receipt(
    test_engine: Engine, committed_teacher: Teacher, settings: Settings
) -> None:
    barrier = threading.Barrier(2)
    outcomes: list[Any] = []

    def issue() -> None:
        with Session(test_engine, expire_on_commit=False) as session:
            teacher = session.get(Teacher, committed_teacher.id)
            assert teacher is not None
            barrier.wait()
            try:
                outcomes.append(_service(session, settings).issue(teacher, PERIOD).folio)
            except DomainError as error:
                outcomes.append(error.code)

    threads = [threading.Thread(target=issue) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    folios = [
        outcome for outcome in outcomes if str(outcome).startswith(settings.payroll_folio_prefix)
    ]
    assert len(folios) == 1
    assert [outcome for outcome in outcomes if outcome not in folios] == ["RECEIPT_ALREADY_ISSUED"]
    with test_engine.connect() as connection:
        count = connection.execute(
            text("SELECT count(*) FROM payroll_receipts WHERE teacher_id = :teacher"),
            {"teacher": committed_teacher.id},
        ).scalar_one()
    assert count == 1
