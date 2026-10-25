import pytest
from sqlalchemy.orm import Session

from app.models import HourlyRate
from tests.business import (
    MONDAY,
    TODAY,
    Api,
    add_schedule,
    create_assignment,
    create_subject,
    error,
    logged,
    ok,
)

pytestmark = pytest.mark.db


def _payload(subject_id: str, career: str = "ISC", rate: str = "125.00") -> dict[str, str]:
    return {"subject_id": subject_id, "career_code": career, "hourly_rate": rate}


class TestCreate:
    def test_joins_subject_career_and_rate(self, teacher_api: Api) -> None:
        subject = create_subject(teacher_api)

        assignment = ok(
            teacher_api.post("/assignments", _payload(subject["id"], rate="135.00")), 201
        )

        assert assignment["subject"]["name"] == "Bases de Datos"
        assert assignment["career"]["code"] == "ISC"
        assert assignment["hourly_rate"] == {"amount": "135.00", "is_active": True}
        assert assignment["is_active"] is True
        assert assignment["has_logbook"] is False
        assert assignment["schedules"] == []
        assert assignment["weekly_hours"] == "0.00"

    def test_same_subject_in_several_careers(self, teacher_api: Api) -> None:
        subject = create_subject(teacher_api)

        for career in ("ISC", "IIND", "LADM"):
            ok(teacher_api.post("/assignments", _payload(subject["id"], career)), 201)

        assert ok(teacher_api.get("/assignments", subject_id=subject["id"]))["total_items"] == 3

    def test_rejects_a_second_active_assignment_of_the_same_subject_and_career(
        self, teacher_api: Api
    ) -> None:
        subject = create_subject(teacher_api)
        ok(teacher_api.post("/assignments", _payload(subject["id"])), 201)

        error(
            teacher_api.post("/assignments", _payload(subject["id"], rate="145.00")),
            409,
            "ASSIGNMENT_ALREADY_EXISTS",
        )

    @pytest.mark.parametrize(
        ("overrides", "status", "code"),
        [
            ({"career_code": "DERECHO"}, 404, "CAREER_NOT_FOUND"),
            ({"hourly_rate": "130.00"}, 404, "RATE_NOT_FOUND"),
            ({"hourly_rate": 125.0}, 422, "VALIDATION_ERROR"),
            ({"hourly_rate": "125.001"}, 422, "VALIDATION_ERROR"),
            ({"subject_id": "00000000-0000-4000-8000-000000000000"}, 404, "SUBJECT_NOT_FOUND"),
        ],
    )
    def test_only_catalog_values_are_accepted(
        self, teacher_api: Api, overrides: dict[str, object], status: int, code: str
    ) -> None:
        subject = create_subject(teacher_api)

        error(teacher_api.post("/assignments", _payload(subject["id"]) | overrides), status, code)

    def test_rejects_inactive_rate(
        self, teacher_api: Api, seeded_session: Session, hourly_rate: HourlyRate
    ) -> None:
        hourly_rate.is_active = False
        seeded_session.flush()
        subject = create_subject(teacher_api)

        error(teacher_api.post("/assignments", _payload(subject["id"])), 422, "RATE_INACTIVE")


class TestRateChange:
    def test_rate_change_does_not_alter_registered_sessions(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api, rate="125.00")
        before = logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        updated = ok(
            teacher_api.patch(f"/assignments/{assignment['id']}", {"hourly_rate": "145.00"})
        )
        after = logged(teacher_api, assignment["id"], TODAY, "07:00", "08:00")

        assert updated["hourly_rate"]["amount"] == "145.00"
        kept = ok(teacher_api.get(f"/logbook/{before['entry']['id']}"))
        assert kept["hourly_rate"] == "125.00"
        assert after["entry"]["hourly_rate"] == "145.00"
        preview = ok(teacher_api.get("/payroll/preview", year=2026, month=10, fortnight=2))
        assert [(line["hourly_rate"], line["amount"]) for line in preview["lines"]] == [
            ("125.00", "250.00"),
            ("145.00", "145.00"),
        ]
        assert preview["total_amount"] == "395.00"
        assert "ASSIGNMENT_RATE_CHANGED" in [w["code"] for w in preview["warnings"]]

    def test_subject_or_career_cannot_change_with_logbook(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        error(
            teacher_api.patch(f"/assignments/{assignment['id']}", {"career_code": "IIND"}),
            409,
            "ASSIGNMENT_HAS_LOGBOOK",
        )

    def test_career_can_change_without_logbook(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)

        updated = ok(teacher_api.patch(f"/assignments/{assignment['id']}", {"career_code": "IIND"}))

        assert updated["career"]["code"] == "IIND"


class TestLifecycle:
    def test_deactivate_keeps_history_removes_schedules_and_allows_a_new_one(
        self, teacher_api: Api
    ) -> None:
        assignment = create_assignment(teacher_api)
        add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        deactivated = ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        assert deactivated["is_active"] is False
        assert deactivated["active_until"] == TODAY.isoformat()
        assert deactivated["schedules"] == []
        assert deactivated["has_logbook"] is True
        replacement = teacher_api.post(
            "/assignments", _payload(assignment["subject"]["id"], rate="135.00")
        )
        ok(replacement, 201)
        error(
            teacher_api.post(f"/assignments/{assignment['id']}/reactivate"),
            409,
            "ASSIGNMENT_ALREADY_EXISTS",
        )

    def test_reactivate(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        reactivated = ok(teacher_api.post(f"/assignments/{assignment['id']}/reactivate"))

        assert (reactivated["is_active"], reactivated["active_until"]) == (True, None)

    def test_inactive_assignment_cannot_be_edited(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        error(
            teacher_api.patch(f"/assignments/{assignment['id']}", {"hourly_rate": "145.00"}),
            422,
            "ASSIGNMENT_INACTIVE",
        )

    def test_delete_without_logbook_removes_its_schedules(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")

        assert teacher_api.delete(f"/assignments/{assignment['id']}").status_code == 204

        error(teacher_api.get(f"/assignments/{assignment['id']}"), 404, "ASSIGNMENT_NOT_FOUND")
        assert ok(teacher_api.get("/schedules/weekly"))["total_minutes"] == 0

    def test_delete_with_logbook_is_rejected(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        logged(teacher_api, assignment["id"], MONDAY, "07:00", "09:00")

        error(teacher_api.delete(f"/assignments/{assignment['id']}"), 409, "ASSIGNMENT_HAS_LOGBOOK")

    def test_list_filters_by_status(self, teacher_api: Api) -> None:
        active = create_assignment(teacher_api, "Redes")
        inactive = create_assignment(teacher_api, "Química")
        ok(teacher_api.post(f"/assignments/{inactive['id']}/deactivate"))

        assert [a["id"] for a in ok(teacher_api.get("/assignments"))["items"]] == [active["id"]]
        assert [
            a["id"] for a in ok(teacher_api.get("/assignments", status="inactive"))["items"]
        ] == [inactive["id"]]
        assert (
            ok(teacher_api.get("/assignments", status="all", career_code="ISC"))["total_items"] == 2
        )
