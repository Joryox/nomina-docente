"""La carga de demostración pasa por los servicios y deja datos coherentes. Corre dentro de
la transacción de la prueba, que se revierte al terminar."""

from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.demo.data import ASSIGNMENTS, DEMO_EMAIL, HISTORY_PERIODS
from app.demo.runner import DemoLoader
from app.models import Assignment, LogbookEntry, PayrollReceipt, PayrollReceiptLine
from app.repositories.user import UserRepository

pytestmark = pytest.mark.db

TODAY = date(2026, 10, 21)


def _count(session: Session, model: type[object]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_loads_a_coherent_demo_account_once(seeded_session: Session, settings: Settings) -> None:
    report = DemoLoader(seeded_session, settings, TODAY).run()

    user = UserRepository(seeded_session).get_by_email(DEMO_EMAIL)
    assert user is not None and user.teacher is not None
    assert report.account_created
    assert report.assignments == len(ASSIGNMENTS)
    # Se emiten todas las quincenas de historia menos la más reciente.
    assert len(report.receipts) == HISTORY_PERIODS - 1
    assert report.sessions > 0
    receipts = seeded_session.scalars(select(PayrollReceipt)).all()
    for receipt in receipts:
        lines = seeded_session.scalars(
            select(PayrollReceiptLine).where(PayrollReceiptLine.receipt_id == receipt.id)
        ).all()
        assert sum(line.amount for line in lines) == receipt.total_amount
        assert sum(line.minutes for line in lines) == receipt.total_minutes
    # El cambio de tarifa ocurre después de la primera quincena: hay sesiones con ambas.
    rates = seeded_session.scalars(select(LogbookEntry.hourly_rate_id).distinct()).all()
    assert len(rates) == 3

    counts = (_count(seeded_session, Assignment), _count(seeded_session, LogbookEntry))
    again = DemoLoader(seeded_session, settings, TODAY).run()

    assert not again.account_created
    assert (again.subjects, again.assignments, again.sessions, again.receipts) == (0, 0, 0, [])
    assert (_count(seeded_session, Assignment), _count(seeded_session, LogbookEntry)) == counts
