"""Aislamiento entre docentes (RN-04, IDOR): el docente B no puede ver, editar, borrar ni
usar nada del docente A. Un recurso ajeno responde 404, igual que uno inexistente, para no
revelar que existe."""

from datetime import date
from typing import Any

import pytest

from tests.business import (
    LAST_MONDAY_OF_Q1,
    MONDAY,
    Api,
    add_schedule,
    create_assignment,
    create_subject,
    error,
    logged,
    ok,
)

pytestmark = pytest.mark.db


@pytest.fixture
def owned(teacher_api: Api) -> dict[str, Any]:
    """Recursos del docente A: materia, asignación, horario, sesión y recibo."""
    assignment = create_assignment(teacher_api)
    schedule = add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")
    old_entry = logged(teacher_api, assignment["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")
    entry = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")
    receipt = ok(
        teacher_api.post("/payroll/receipts", {"year": 2026, "month": 10, "fortnight": 1}), 201
    )
    return {
        "subject": assignment["subject"]["id"],
        "assignment": assignment["id"],
        "schedule": schedule["id"],
        "entry": entry["entry"]["id"],
        "locked_entry": old_entry["entry"]["id"],
        "receipt": receipt["id"],
    }


READS = [
    ("/subjects/{subject}", "SUBJECT_NOT_FOUND"),
    ("/assignments/{assignment}", "ASSIGNMENT_NOT_FOUND"),
    ("/assignments/{assignment}/schedules", "ASSIGNMENT_NOT_FOUND"),
    ("/logbook/{entry}", "LOGBOOK_ENTRY_NOT_FOUND"),
    ("/payroll/receipts/{receipt}", "RECEIPT_NOT_FOUND"),
]


@pytest.mark.parametrize(("path", "code"), READS)
def test_cannot_read(other_api: Api, owned: dict[str, Any], path: str, code: str) -> None:
    error(other_api.get(path.format(**owned)), 404, code)


@pytest.mark.parametrize(
    ("path", "body", "code"),
    [
        ("/subjects/{subject}", {"name": "Robada"}, "SUBJECT_NOT_FOUND"),
        ("/assignments/{assignment}", {"hourly_rate": "145.00"}, "ASSIGNMENT_NOT_FOUND"),
        ("/schedules/{schedule}", {"end_time": "10:00"}, "SCHEDULE_NOT_FOUND"),
        ("/logbook/{entry}", {"notes": "x"}, "LOGBOOK_ENTRY_NOT_FOUND"),
    ],
)
def test_cannot_edit(
    other_api: Api, owned: dict[str, Any], path: str, body: dict[str, Any], code: str
) -> None:
    error(other_api.patch(path.format(**owned), body), 404, code)


@pytest.mark.parametrize(
    ("path", "code"),
    [
        ("/subjects/{subject}", "SUBJECT_NOT_FOUND"),
        ("/assignments/{assignment}", "ASSIGNMENT_NOT_FOUND"),
        ("/schedules/{schedule}", "SCHEDULE_NOT_FOUND"),
        ("/logbook/{entry}", "LOGBOOK_ENTRY_NOT_FOUND"),
        ("/logbook/{locked_entry}", "LOGBOOK_ENTRY_NOT_FOUND"),
    ],
)
def test_cannot_delete(other_api: Api, owned: dict[str, Any], path: str, code: str) -> None:
    error(other_api.delete(path.format(**owned)), 404, code)


@pytest.mark.parametrize(
    ("path", "code"),
    [
        ("/subjects/{subject}/reactivate", "SUBJECT_NOT_FOUND"),
        ("/assignments/{assignment}/deactivate", "ASSIGNMENT_NOT_FOUND"),
        ("/assignments/{assignment}/reactivate", "ASSIGNMENT_NOT_FOUND"),
    ],
)
def test_cannot_change_state(other_api: Api, owned: dict[str, Any], path: str, code: str) -> None:
    error(other_api.post(path.format(**owned)), 404, code)


def test_cannot_use_foreign_resources_in_own_records(other_api: Api, owned: dict[str, Any]) -> None:
    own = create_assignment(other_api, "Química")
    error(
        other_api.post(
            "/assignments",
            {"subject_id": owned["subject"], "career_code": "ISC", "hourly_rate": "125.00"},
        ),
        404,
        "SUBJECT_NOT_FOUND",
    )
    error(
        other_api.post(
            f"/assignments/{owned['assignment']}/schedules",
            {"weekday": 2, "start_time": "07:00", "end_time": "09:00"},
        ),
        404,
        "ASSIGNMENT_NOT_FOUND",
    )
    error(
        other_api.post(
            "/logbook",
            {
                "assignment_id": owned["assignment"],
                "session_date": "2026-10-20",
                "start_time": "07:00",
                "end_time": "09:00",
            },
        ),
        404,
        "ASSIGNMENT_NOT_FOUND",
    )
    error(
        other_api.post(
            "/logbook/quick",
            {"session_date": MONDAY.isoformat(), "entries": [{"schedule_id": owned["schedule"]}]},
        ),
        404,
        "SCHEDULE_NOT_FOUND",
    )
    entry = logged(other_api, own["id"], date(2026, 10, 20), "07:00", "09:00")["entry"]
    error(
        other_api.patch(f"/logbook/{entry['id']}", {"assignment_id": owned["assignment"]}),
        404,
        "ASSIGNMENT_NOT_FOUND",
    )
    error(other_api.get("/logbook", assignment_id=owned["assignment"]), 404, "ASSIGNMENT_NOT_FOUND")
    error(other_api.get("/assignments", subject_id=owned["subject"]), 404, "SUBJECT_NOT_FOUND")


def test_listings_and_summaries_only_show_own_data(other_api: Api, owned: dict[str, Any]) -> None:
    assert ok(other_api.get("/subjects", status="all"))["total_items"] == 0
    assert ok(other_api.get("/assignments", status="all"))["total_items"] == 0
    assert ok(other_api.get("/schedules/weekly"))["total_minutes"] == 0
    assert ok(other_api.get("/logbook"))["totals"]["session_count"] == 0
    assert ok(other_api.get("/logbook/scheduled", date=MONDAY.isoformat()))["classes"] == []
    assert ok(other_api.get("/payroll/receipts"))["total_items"] == 0
    preview = ok(other_api.get("/payroll/preview", year=2026, month=10, fortnight=1))
    assert (preview["status"], preview["lines"]) == ("closed", [])
    periods = ok(other_api.get("/payroll/periods", year=2026))["periods"]
    assert all(period["receipt_id"] is None for period in periods)
    summary = ok(other_api.get("/dashboard/summary"))
    assert summary["latest_receipts"] == []
    assert summary["current_period"]["session_count"] == 0


def test_the_owner_period_lock_does_not_affect_others(
    other_api: Api, owned: dict[str, Any]
) -> None:
    own = create_assignment(other_api)

    ok(
        other_api.post(
            "/logbook",
            {
                "assignment_id": own["id"],
                "session_date": "2026-10-12",
                "start_time": "07:00",
                "end_time": "09:00",
            },
        ),
        201,
    )
    ok(other_api.post("/payroll/receipts", {"year": 2026, "month": 10, "fortnight": 1}), 201)


def test_same_subject_name_is_independent(other_api: Api, owned: dict[str, Any]) -> None:
    assert create_subject(other_api, "Bases de Datos")["name"] == "Bases de Datos"
