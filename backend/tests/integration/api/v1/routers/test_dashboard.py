from datetime import date

import pytest

from tests.business import (
    LAST_MONDAY_OF_Q1,
    TODAY,
    Api,
    add_schedule,
    create_assignment,
    logged,
    ok,
)

pytestmark = pytest.mark.db


def test_summary_of_a_new_teacher(teacher_api: Api) -> None:
    summary = ok(teacher_api.get("/dashboard/summary"))

    current = summary["current_period"]
    assert (current["period"]["month"], current["period"]["fortnight"]) == (10, 2)
    assert (current["status"], current["session_count"], current["estimated_amount"]) == (
        "open",
        0,
        "0.00",
    )
    assert summary["today"] == {
        "date": TODAY.isoformat(),
        "classes": [],
        "registered_count": 0,
        "pending_count": 0,
    }
    assert summary["pending_sessions"] == {"count": 0, "total_minutes": 0}
    assert summary["latest_receipts"] == []


def test_summary_with_classes_sessions_and_receipts(teacher_api: Api) -> None:
    databases = create_assignment(teacher_api, rate="125.00")
    networks = create_assignment(teacher_api, "Redes", career="IIND", rate="145.00")
    add_schedule(teacher_api, databases["id"], 1, "07:00", "09:00")
    add_schedule(teacher_api, databases["id"], 3, "16:00", "17:00")
    add_schedule(teacher_api, networks["id"], 3, "19:00", "21:00")
    logged(teacher_api, databases["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")
    receipt = ok(
        teacher_api.post("/payroll/receipts", {"year": 2026, "month": 10, "fortnight": 1}), 201
    )
    logged(teacher_api, databases["id"], date(2026, 10, 16), "08:00", "09:30")
    logged(teacher_api, databases["id"], TODAY, "16:00", "17:00")

    summary = ok(teacher_api.get("/dashboard/summary"))

    current = summary["current_period"]
    assert (current["session_count"], current["total_minutes"], current["total_hours"]) == (
        2,
        150,
        "2.50",
    )
    assert current["estimated_amount"] == "312.50"
    today = summary["today"]
    assert [c["assignment"]["subject_name"] for c in today["classes"]] == [
        "Bases de Datos",
        "Redes",
    ]
    assert (today["registered_count"], today["pending_count"]) == (1, 1)
    # Solo el lunes 19 de 07:00 terminó sin registrar; la de hoy a las 19:00 no ha empezado.
    assert summary["pending_sessions"] == {"count": 1, "total_minutes": 120}
    assert [r["id"] for r in summary["latest_receipts"]] == [receipt["id"]]
