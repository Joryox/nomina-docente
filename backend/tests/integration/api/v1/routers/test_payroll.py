from datetime import date
from typing import Any

import pytest
from fastapi import FastAPI

from app.api.v1.dependencies import get_business_policy
from app.core.config import Settings
from app.services.policy import BusinessPolicy
from tests.business import (
    LAST_MONDAY_OF_Q1,
    MONDAY,
    Api,
    add_schedule,
    create_assignment,
    error,
    logged,
    ok,
)

pytestmark = pytest.mark.db

Q1 = {"year": 2026, "month": 10, "fortnight": 1}
Q2 = {"year": 2026, "month": 10, "fortnight": 2}


@pytest.fixture
def first_fortnight(teacher_api: Api) -> dict[str, Any]:
    """1.ª quincena de octubre (ya terminó) con tres asignaciones y redondeos reales:

    - Bases de Datos, ISC, $125: dos sesiones de 50 min → 100 min → $208.33
    - Redes, IIND, $135: una sesión de 90 min → $202.50
    - Cálculo, LADM, $145: una sesión de 50 min → $120.83
    """
    databases = create_assignment(teacher_api, "Bases de Datos", "ISC", "125.00")
    networks = create_assignment(teacher_api, "Redes", "IIND", "135.00")
    calculus = create_assignment(teacher_api, "Cálculo", "LADM", "145.00")
    logged(teacher_api, databases["id"], date(2026, 10, 5), "07:00", "07:50")
    logged(teacher_api, databases["id"], LAST_MONDAY_OF_Q1, "07:00", "07:50")
    logged(teacher_api, networks["id"], date(2026, 10, 6), "10:00", "11:30")
    logged(teacher_api, calculus["id"], date(2026, 10, 15), "16:00", "16:50")
    return {"databases": databases, "networks": networks, "calculus": calculus}


def _preview(api: Api, period: dict[str, int]) -> dict[str, Any]:
    result: dict[str, Any] = ok(api.get("/payroll/preview", **period))
    return result


def _issue(api: Api, period: dict[str, int]) -> Any:
    return api.post("/payroll/receipts", period)


class TestPreview:
    def test_calculates_lines_and_totals_with_exact_rounding(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        preview = _preview(teacher_api, Q1)

        assert [
            (
                line["subject_name"],
                line["session_count"],
                line["minutes"],
                line["hours"],
                line["amount"],
            )
            for line in preview["lines"]
        ] == [
            ("Bases de Datos", 2, 100, "1.67", "208.33"),
            ("Cálculo", 1, 50, "0.83", "120.83"),
            ("Redes", 1, 90, "1.50", "202.50"),
        ]
        assert preview["total_minutes"] == 240
        assert preview["total_hours"] == "4.00"
        assert preview["total_amount"] == "531.66"
        assert (preview["status"], preview["can_issue"], preview["issue_blockers"]) == (
            "closed",
            True,
            [],
        )
        assert preview["period"]["start_date"] == "2026-10-01"
        assert preview["period"]["end_date"] == "2026-10-15"

    def test_current_period_warns_and_cannot_be_issued_yet(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")
        add_schedule(teacher_api, assignment["id"], 3, "16:00", "17:00")
        add_schedule(teacher_api, assignment["id"], 3, "19:00", "21:00")
        logged(teacher_api, assignment["id"], date(2026, 10, 16), "08:00", "10:00")

        preview = _preview(teacher_api, Q2)

        assert preview["status"] == "open"
        assert preview["issue_blockers"] == ["PERIOD_NOT_FINISHED"]
        warnings = {warning["code"]: warning for warning in preview["warnings"]}
        assert set(warnings) == {
            "PERIOD_NOT_FINISHED",
            "SCHEDULED_CLASSES_NOT_REGISTERED",
            "SESSIONS_OUTSIDE_SCHEDULE",
        }
        missing = warnings["SCHEDULED_CLASSES_NOT_REGISTERED"]["details"]
        # Lunes 19 de 07:00 y hoy miércoles 21 de 16:00; la de 19:00 aún no termina.
        assert [(item["date"], item["start_time"]) for item in missing["items"]] == [
            ("2026-10-19", "07:00"),
            ("2026-10-21", "16:00"),
        ]
        outside = warnings["SESSIONS_OUTSIDE_SCHEDULE"]["details"]["items"]
        assert [item["date"] for item in outside] == ["2026-10-16"]

    def test_future_and_empty_periods(self, teacher_api: Api) -> None:
        future = _preview(teacher_api, {"year": 2026, "month": 11, "fortnight": 1})
        empty = _preview(teacher_api, Q1)

        assert future["status"] == "future"
        assert set(future["issue_blockers"]) == {"PERIOD_IN_FUTURE", "PERIOD_WITHOUT_SESSIONS"}
        assert empty["issue_blockers"] == ["PERIOD_WITHOUT_SESSIONS"]
        assert (empty["total_amount"], empty["total_hours"]) == ("0.00", "0.00")

    @pytest.mark.parametrize(
        "params",
        [
            {"year": 2026, "month": 13, "fortnight": 1},
            {"year": 2026, "month": 10, "fortnight": 3},
            {"year": 2026},
        ],
    )
    def test_rejects_invalid_periods(self, teacher_api: Api, params: dict[str, int]) -> None:
        error(teacher_api.get("/payroll/preview", **params), 422, "VALIDATION_ERROR")


class TestIssue:
    def test_issued_receipt_matches_the_preview_exactly(
        self, teacher_api: Api, first_fortnight: dict[str, Any], settings: Settings
    ) -> None:
        preview = _preview(teacher_api, Q1)

        receipt = ok(_issue(teacher_api, Q1), 201)

        assert receipt["total_amount"] == preview["total_amount"]
        assert receipt["total_hours"] == preview["total_hours"]
        assert receipt["total_minutes"] == preview["total_minutes"]
        assert [
            (
                line["subject_name"],
                line["hourly_rate"],
                line["minutes"],
                line["hours"],
                line["amount"],
            )
            for line in receipt["lines"]
        ] == [
            (
                line["subject_name"],
                line["hourly_rate"],
                line["minutes"],
                line["hours"],
                line["amount"],
            )
            for line in preview["lines"]
        ]
        assert receipt["folio"].startswith(f"{settings.payroll_folio_prefix}-202610-Q1-")
        assert len(receipt["folio"].rsplit("-", 1)[1]) == 6
        assert receipt["institution"] == {
            "name": settings.institution_name,
            "short_name": settings.institution_short_name,
        }
        assert receipt["teacher"] == {
            "full_name": "Ana María García López",
            "employee_number": "TESH-0001",
        }

    def test_issuing_locks_the_logbook_and_marks_the_period(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        receipt = ok(_issue(teacher_api, Q1), 201)

        preview = _preview(teacher_api, Q1)
        assert (preview["status"], preview["receipt_id"], preview["can_issue"]) == (
            "issued",
            receipt["id"],
            False,
        )
        entries = ok(teacher_api.get("/logbook", **Q1))["items"]
        assert all(entry["is_locked"] for entry in entries)
        error(teacher_api.delete(f"/logbook/{entries[0]['id']}"), 409, "PERIOD_LOCKED")

    def test_receipt_is_a_fixed_copy(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        receipt = ok(_issue(teacher_api, Q1), 201)
        databases = first_fortnight["databases"]

        ok(
            teacher_api.patch(
                f"/subjects/{databases['subject']['id']}", {"name": "Bases de Datos I"}
            )
        )
        ok(teacher_api.patch(f"/assignments/{databases['id']}", {"hourly_rate": "145.00"}))
        ok(teacher_api.patch("/auth/me", {"first_names": "Ana"}))

        again = ok(teacher_api.get(f"/payroll/receipts/{receipt['id']}"))
        assert again == receipt

    def test_a_period_is_issued_only_once(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        receipt = ok(_issue(teacher_api, Q1), 201)

        body = error(_issue(teacher_api, Q1), 409, "RECEIPT_ALREADY_ISSUED")

        assert body["details"]["folio"] == receipt["folio"]

    def test_folios_are_unique_and_consecutive(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        databases = first_fortnight["databases"]
        logged(teacher_api, databases["id"], date(2026, 9, 28), "07:00", "09:00")

        september = ok(_issue(teacher_api, {"year": 2026, "month": 9, "fortnight": 2}), 201)
        october = ok(_issue(teacher_api, Q1), 201)

        first = int(september["folio"].rsplit("-", 1)[1])
        second = int(october["folio"].rsplit("-", 1)[1])
        assert second == first + 1
        assert september["folio"].split("-")[1:3] == ["202609", "Q2"]

    def test_current_period_cannot_be_issued_by_default(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        error(_issue(teacher_api, Q2), 422, "PERIOD_NOT_FINISHED")

    def test_current_period_can_be_issued_when_configured(
        self, teacher_api: Api, business_app: FastAPI, settings: Settings
    ) -> None:
        policy = BusinessPolicy.from_settings(settings)
        business_app.dependency_overrides[get_business_policy] = lambda: BusinessPolicy(
            class_min_duration_minutes=policy.class_min_duration_minutes,
            class_max_duration_minutes=policy.class_max_duration_minutes,
            logbook_max_age_days=policy.logbook_max_age_days,
            payroll_issue_requires_closed_period=False,
        )
        assignment = create_assignment(teacher_api)
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        ok(_issue(teacher_api, Q2), 201)
        error(
            _issue(teacher_api, {"year": 2026, "month": 11, "fortnight": 1}),
            422,
            "PERIOD_IN_FUTURE",
        )

    def test_a_period_without_sessions_is_not_issued(self, teacher_api: Api) -> None:
        error(_issue(teacher_api, Q1), 422, "PERIOD_WITHOUT_SESSIONS")

    def test_future_period_is_rejected(self, teacher_api: Api) -> None:
        error(
            _issue(teacher_api, {"year": 2026, "month": 11, "fortnight": 1}),
            422,
            "PERIOD_IN_FUTURE",
        )


class TestReceiptsAndPeriods:
    def test_lists_receipts_newest_first_and_by_year(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        logged(teacher_api, first_fortnight["databases"]["id"], date(2026, 9, 28), "07:00", "09:00")
        september = ok(_issue(teacher_api, {"year": 2026, "month": 9, "fortnight": 2}), 201)
        october = ok(_issue(teacher_api, Q1), 201)

        page = ok(teacher_api.get("/payroll/receipts"))
        other_year = ok(teacher_api.get("/payroll/receipts", year=2025))

        assert [item["id"] for item in page["items"]] == [october["id"], september["id"]]
        assert page["items"][0]["total_amount"] == "531.66"
        assert other_year["total_items"] == 0

    def test_periods_of_a_year_with_their_status(
        self, teacher_api: Api, first_fortnight: dict[str, Any]
    ) -> None:
        receipt = ok(_issue(teacher_api, Q1), 201)

        result = ok(teacher_api.get("/payroll/periods", year=2026))

        periods = result["periods"]
        assert len(periods) == 24
        by_key = {(p["period"]["month"], p["period"]["fortnight"]): p for p in periods}
        assert by_key[(10, 1)]["status"] == "issued"
        assert by_key[(10, 1)]["folio"] == receipt["folio"]
        assert by_key[(10, 2)]["status"] == "open"
        assert by_key[(9, 2)]["status"] == "closed"
        assert by_key[(11, 1)]["status"] == "future"
        assert by_key[(2, 2)]["period"]["end_date"] == "2026-02-28"

    def test_leap_february(self, teacher_api: Api) -> None:
        periods = ok(teacher_api.get("/payroll/periods", year=2028))["periods"]

        assert periods[3]["period"]["end_date"] == "2028-02-29"

    def test_unknown_receipt(self, teacher_api: Api) -> None:
        error(
            teacher_api.get("/payroll/receipts/00000000-0000-4000-8000-000000000000"),
            404,
            "RECEIPT_NOT_FOUND",
        )
