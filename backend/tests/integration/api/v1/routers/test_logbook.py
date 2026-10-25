from datetime import date, timedelta
from typing import Any

import pytest

from tests.business import (
    LAST_MONDAY_OF_Q1,
    MONDAY,
    TODAY,
    TUESDAY,
    Api,
    add_schedule,
    create_assignment,
    error,
    log_session,
    logged,
    ok,
)

pytestmark = pytest.mark.db


@pytest.fixture
def assignment(teacher_api: Api) -> dict[str, Any]:
    """Bases de Datos (ISC, $125) con clase los lunes de 07:00 a 09:00 y los miércoles de
    16:00 a 17:00 (hoy, ya terminó) y de 19:00 a 21:00 (hoy, aún no empieza)."""
    created = create_assignment(teacher_api)
    add_schedule(teacher_api, created["id"], 1, "07:00", "09:00")
    add_schedule(teacher_api, created["id"], 3, "16:00", "17:00")
    add_schedule(teacher_api, created["id"], 3, "19:00", "21:00")
    return created


def _issue_first_fortnight(api: Api) -> dict[str, Any]:
    result: dict[str, Any] = ok(
        api.post("/payroll/receipts", {"year": 2026, "month": 10, "fortnight": 1}), 201
    )
    return result


class TestCreate:
    def test_server_computes_minutes_hours_and_freezes_the_rate(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        result = ok(
            log_session(teacher_api, assignment["id"], MONDAY, "07:00", "09:00", notes="  Tema 3 "),
            201,
        )

        entry = result["entry"]
        assert (entry["minutes"], entry["hours"], entry["hourly_rate"]) == (120, "2.00", "125.00")
        assert entry["notes"] == "Tema 3"
        assert entry["period"] == {"year": 2026, "month": 10, "fortnight": 2}
        assert entry["matches_schedule"] is True
        assert entry["is_locked"] is False
        assert result["warnings"] == []

    def test_client_cannot_send_hours_or_amounts(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        response = log_session(teacher_api, assignment["id"], MONDAY, "07:00", "09:00", minutes=600)

        error(response, 422, "VALIDATION_ERROR")

    def test_different_times_are_accepted_with_a_warning(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        result = ok(log_session(teacher_api, assignment["id"], MONDAY, "07:10", "08:50"), 201)

        assert result["entry"]["matches_schedule"] is False
        (warning,) = result["warnings"]
        assert warning["code"] == "SESSION_TIMES_DIFFER"
        assert warning["details"]["scheduled"] == ["07:00–09:00"]

    def test_unscheduled_day_is_accepted_with_a_warning(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        result = ok(log_session(teacher_api, assignment["id"], TUESDAY, "07:00", "09:00"), 201)

        assert [w["code"] for w in result["warnings"]] == ["SESSION_NOT_SCHEDULED"]

    @pytest.mark.parametrize(
        ("day", "start", "end", "status", "code"),
        [
            (TODAY + timedelta(days=1), "07:00", "09:00", 422, "SESSION_DATE_IN_FUTURE"),
            (TODAY, "17:00", "19:00", 422, "SESSION_NOT_FINISHED"),
            (TODAY - timedelta(days=31), "07:00", "09:00", 422, "SESSION_DATE_TOO_OLD"),
            (MONDAY, "09:00", "07:00", 422, "TIME_RANGE_INVALID"),
            (MONDAY, "07:00", "07:15", 422, "CLASS_TOO_SHORT"),
            (MONDAY, "07:00", "13:00", 422, "CLASS_TOO_LONG"),
        ],
    )
    def test_session_rules(
        self,
        teacher_api: Api,
        assignment: dict[str, Any],
        day: date,
        start: str,
        end: str,
        status: int,
        code: str,
    ) -> None:
        error(log_session(teacher_api, assignment["id"], day, start, end), status, code)

    def test_limits_of_the_rules_are_inclusive(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        ok(
            log_session(
                teacher_api, assignment["id"], TODAY - timedelta(days=30), "07:00", "09:00"
            ),
            201,
        )
        ok(log_session(teacher_api, assignment["id"], TODAY, "16:00", "18:00"), 201)

    def test_overlapping_sessions_on_the_same_day_are_rejected(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        other = create_assignment(teacher_api, "Redes", career="IIND")
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        body = error(
            log_session(teacher_api, other["id"], MONDAY, "08:00", "10:00"), 409, "SESSION_OVERLAP"
        )

        assert "Bases de Datos" in body["message"]
        assert body["details"]["conflicts"][0]["start_time"] == "07:00"
        ok(log_session(teacher_api, other["id"], MONDAY, "09:00", "10:00"), 201)

    def test_session_after_deactivation_date_is_rejected(
        self, teacher_api: Api, assignment: dict[str, Any], business_clock: Any
    ) -> None:
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        ok(log_session(teacher_api, assignment["id"], MONDAY, "07:00", "09:00"), 201)
        business_clock.advance(timedelta(days=5))
        body = error(
            log_session(teacher_api, assignment["id"], TODAY + timedelta(days=1), "07:00", "09:00"),
            422,
            "ASSIGNMENT_INACTIVE_ON_DATE",
        )
        assert "21 de octubre de 2026" in body["message"]

    def test_issued_period_is_locked(self, teacher_api: Api, assignment: dict[str, Any]) -> None:
        logged(teacher_api, assignment["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")
        _issue_first_fortnight(teacher_api)

        body = error(
            log_session(teacher_api, assignment["id"], date(2026, 10, 5), "07:00", "09:00"),
            409,
            "PERIOD_LOCKED",
        )

        assert "1.ª quincena de octubre de 2026" in body["message"]


class TestUpdateAndDelete:
    def test_edit_revalidates_and_keeps_the_rate(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        entry = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")["entry"]
        ok(teacher_api.patch(f"/assignments/{assignment['id']}", {"hourly_rate": "145.00"}))

        result = ok(
            teacher_api.patch(
                f"/logbook/{entry['id']}", {"end_time": "08:30", "notes": "Salida temprana"}
            )
        )

        assert (result["entry"]["minutes"], result["entry"]["hourly_rate"]) == (90, "125.00")
        assert result["entry"]["notes"] == "Salida temprana"
        assert [w["code"] for w in result["warnings"]] == ["SESSION_TIMES_DIFFER"]

    def test_moving_to_another_assignment_takes_its_rate(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        other = create_assignment(teacher_api, "Redes", career="LADM", rate="145.00")
        entry = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")["entry"]

        result = ok(teacher_api.patch(f"/logbook/{entry['id']}", {"assignment_id": other["id"]}))

        assert result["entry"]["assignment"]["subject_name"] == "Redes"
        assert result["entry"]["hourly_rate"] == "145.00"

    def test_edit_cannot_overlap_another_session(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")
        later = logged(teacher_api, assignment["id"], MONDAY, "10:00", "11:00")["entry"]

        error(
            teacher_api.patch(f"/logbook/{later['id']}", {"start_time": "08:00"}),
            409,
            "SESSION_OVERLAP",
        )

    def test_notes_only_edit_of_an_old_session_is_allowed(
        self, teacher_api: Api, assignment: dict[str, Any], business_clock: Any
    ) -> None:
        entry = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")["entry"]
        business_clock.advance(timedelta(days=40))

        ok(teacher_api.patch(f"/logbook/{entry['id']}", {"notes": "Corrección"}))
        error(
            teacher_api.patch(f"/logbook/{entry['id']}", {"session_date": TUESDAY.isoformat()}),
            422,
            "SESSION_DATE_TOO_OLD",
        )

    def test_locked_sessions_cannot_be_edited_or_deleted(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        entry = logged(teacher_api, assignment["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")["entry"]
        _issue_first_fortnight(teacher_api)

        error(teacher_api.patch(f"/logbook/{entry['id']}", {"notes": "x"}), 409, "PERIOD_LOCKED")
        error(teacher_api.delete(f"/logbook/{entry['id']}"), 409, "PERIOD_LOCKED")
        assert ok(teacher_api.get(f"/logbook/{entry['id']}"))["is_locked"] is True

    def test_a_session_cannot_be_moved_into_a_locked_period(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        logged(teacher_api, assignment["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")
        _issue_first_fortnight(teacher_api)
        entry = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")["entry"]

        error(
            teacher_api.patch(f"/logbook/{entry['id']}", {"session_date": "2026-10-13"}),
            409,
            "PERIOD_LOCKED",
        )

    def test_delete(self, teacher_api: Api, assignment: dict[str, Any]) -> None:
        entry = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")["entry"]

        assert teacher_api.delete(f"/logbook/{entry['id']}").status_code == 204
        error(teacher_api.get(f"/logbook/{entry['id']}"), 404, "LOGBOOK_ENTRY_NOT_FOUND")


class TestScheduledClasses:
    def test_prefills_times_and_marks_registered_and_due(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        registered = logged(teacher_api, assignment["id"], TODAY, "16:05", "17:00")["entry"]

        day = ok(teacher_api.get("/logbook/scheduled", date=TODAY.isoformat()))

        assert day["weekday"] == 3
        assert day["period"]["is_current"] is True
        first, second = day["classes"]
        assert (first["start_time"], first["end_time"]) == ("16:00", "17:00")
        assert (first["registered"], first["logbook_entry_id"], first["is_due"]) == (
            True,
            registered["id"],
            True,
        )
        assert (second["start_time"], second["registered"], second["is_due"]) == (
            "19:00",
            False,
            False,
        )

    def test_day_without_classes(self, teacher_api: Api, assignment: dict[str, Any]) -> None:
        assert ok(teacher_api.get("/logbook/scheduled", date=TUESDAY.isoformat()))["classes"] == []


class TestQuickRegister:
    def test_registers_several_classes_with_schedule_times(self, teacher_api: Api) -> None:
        databases = create_assignment(teacher_api)
        networks = create_assignment(teacher_api, "Redes", career="IIND", rate="135.00")
        first = add_schedule(teacher_api, databases["id"], 1, "07:00", "09:00")
        second = add_schedule(teacher_api, networks["id"], 1, "10:00", "12:00")

        response = ok(
            teacher_api.post(
                "/logbook/quick",
                {
                    "session_date": MONDAY.isoformat(),
                    "entries": [
                        {"schedule_id": first["id"]},
                        {"schedule_id": second["id"], "end_time": "11:50", "notes": "Examen"},
                    ],
                },
            ),
            201,
        )

        entries = [result["entry"] for result in response["results"]]
        assert [(e["start_time"], e["end_time"], e["hourly_rate"]) for e in entries] == [
            ("07:00", "09:00", "125.00"),
            ("10:00", "11:50", "135.00"),
        ]
        assert [w["code"] for w in response["results"][1]["warnings"]] == ["SESSION_TIMES_DIFFER"]

    def test_is_all_or_nothing(self, teacher_api: Api) -> None:
        databases = create_assignment(teacher_api)
        first = add_schedule(teacher_api, databases["id"], 1, "07:00", "09:00")
        second = add_schedule(teacher_api, databases["id"], 1, "10:00", "12:00")
        logged(teacher_api, databases["id"], MONDAY, "10:30", "11:30")

        body = error(
            teacher_api.post(
                "/logbook/quick",
                {
                    "session_date": MONDAY.isoformat(),
                    "entries": [{"schedule_id": first["id"]}, {"schedule_id": second["id"]}],
                },
            ),
            409,
            "SESSION_OVERLAP",
        )

        assert body["details"]["entry_index"] == 1
        assert ok(teacher_api.get("/logbook"))["totals"]["session_count"] == 1

    def test_schedule_must_match_the_weekday(self, teacher_api: Api) -> None:
        databases = create_assignment(teacher_api)
        monday_class = add_schedule(teacher_api, databases["id"], 1, "07:00", "09:00")

        error(
            teacher_api.post(
                "/logbook/quick",
                {
                    "session_date": TUESDAY.isoformat(),
                    "entries": [{"schedule_id": monday_class["id"]}],
                },
            ),
            422,
            "SCHEDULE_NOT_ON_DATE",
        )

    def test_rejects_repeated_schedules(self, teacher_api: Api) -> None:
        databases = create_assignment(teacher_api)
        schedule = add_schedule(teacher_api, databases["id"], 1, "07:00", "09:00")

        error(
            teacher_api.post(
                "/logbook/quick",
                {
                    "session_date": MONDAY.isoformat(),
                    "entries": [{"schedule_id": schedule["id"]}, {"schedule_id": schedule["id"]}],
                },
            ),
            422,
            "VALIDATION_ERROR",
        )


class TestList:
    def test_filters_and_totals(self, teacher_api: Api, assignment: dict[str, Any]) -> None:
        other = create_assignment(teacher_api, "Redes", career="IIND")
        logged(teacher_api, assignment["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "08:50")
        logged(teacher_api, other["id"], MONDAY, "10:00", "11:00")

        everything = ok(teacher_api.get("/logbook"))
        second_fortnight = ok(teacher_api.get("/logbook", year=2026, month=10, fortnight=2))
        by_assignment = ok(teacher_api.get("/logbook", assignment_id=assignment["id"]))
        by_dates = ok(teacher_api.get("/logbook", date_from="2026-10-01", date_to="2026-10-15"))

        assert everything["totals"] == {
            "session_count": 3,
            "total_minutes": 290,
            "total_hours": "4.83",
        }
        assert [e["session_date"] for e in everything["items"]] == [
            "2026-10-19",
            "2026-10-19",
            "2026-10-12",
        ]
        assert second_fortnight["totals"]["total_minutes"] == 170
        assert by_assignment["totals"]["session_count"] == 2
        assert by_dates["totals"]["total_minutes"] == 120

    def test_totals_cover_the_whole_filter_not_only_the_page(
        self, teacher_api: Api, assignment: dict[str, Any]
    ) -> None:
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")
        logged(teacher_api, assignment["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")

        page = ok(teacher_api.get("/logbook", page_size=1))

        assert len(page["items"]) == 1
        assert (page["total_items"], page["total_pages"]) == (2, 2)
        assert page["totals"]["total_minutes"] == 240

    @pytest.mark.parametrize(
        "params",
        [
            {"year": 2026},
            {"year": 2026, "month": 10},
            {"date_from": "2026-10-20", "date_to": "2026-10-10"},
        ],
    )
    def test_rejects_incomplete_or_inverted_filters(
        self, teacher_api: Api, params: dict[str, object]
    ) -> None:
        error(teacher_api.get("/logbook", **params), 422, "VALIDATION_ERROR")
