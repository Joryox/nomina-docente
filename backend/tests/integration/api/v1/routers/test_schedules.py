import pytest
from httpx import Response

from tests.business import Api, add_schedule, create_assignment, create_subject, error, ok

pytestmark = pytest.mark.db


def _schedule(api: Api, assignment_id: str, weekday: int, start: str, end: str) -> Response:
    return api.post(
        f"/assignments/{assignment_id}/schedules",
        {"weekday": weekday, "start_time": start, "end_time": end},
    )


class TestCreate:
    def test_adds_a_weekly_class(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)

        schedule = add_schedule(teacher_api, assignment["id"], 1, "07:00", "08:50")

        assert schedule["weekday"] == 1
        assert (schedule["start_time"], schedule["end_time"]) == ("07:00", "08:50")
        assert schedule["duration_minutes"] == 110
        listed = ok(teacher_api.get(f"/assignments/{assignment['id']}/schedules"))
        assert [item["id"] for item in listed] == [schedule["id"]]

    def test_overlap_with_another_assignment_names_the_class(self, teacher_api: Api) -> None:
        databases = create_assignment(teacher_api, "Bases de Datos")
        networks = create_assignment(teacher_api, "Redes", career="IIND")
        add_schedule(teacher_api, databases["id"], 1, "10:00", "12:00")

        body = error(
            _schedule(teacher_api, networks["id"], 1, "11:00", "13:00"), 409, "SCHEDULE_OVERLAP"
        )

        assert body["message"] == (
            "El lunes, 11:00–13:00 se empalma con Bases de Datos (Ingeniería en Sistemas "
            "Computacionales), de 10:00–12:00. Elige otra hora de entrada o de salida para ese "
            "día."
        )
        (conflict,) = body["details"]["conflicts"]
        assert conflict["subject_name"] == "Bases de Datos"
        assert (conflict["weekday"], conflict["start_time"], conflict["end_time"]) == (
            1,
            "10:00",
            "12:00",
        )

    @pytest.mark.parametrize(
        ("weekday", "start", "end"),
        [(1, "12:00", "14:00"), (1, "08:00", "10:00"), (2, "10:00", "12:00")],
    )
    def test_back_to_back_or_other_days_do_not_overlap(
        self, teacher_api: Api, weekday: int, start: str, end: str
    ) -> None:
        assignment = create_assignment(teacher_api)
        add_schedule(teacher_api, assignment["id"], 1, "10:00", "12:00")

        ok(_schedule(teacher_api, assignment["id"], weekday, start, end), 201)

    def test_other_teachers_do_not_block(self, teacher_api: Api, other_api: Api) -> None:
        mine = create_assignment(teacher_api)
        theirs = create_assignment(other_api)
        add_schedule(teacher_api, mine["id"], 1, "10:00", "12:00")

        ok(_schedule(other_api, theirs["id"], 1, "10:00", "12:00"), 201)

    @pytest.mark.parametrize(
        ("start", "end", "code"),
        [
            ("10:00", "10:00", "TIME_RANGE_INVALID"),
            ("23:00", "01:00", "TIME_RANGE_INVALID"),
            ("10:00", "10:20", "CLASS_TOO_SHORT"),
            ("07:00", "12:01", "CLASS_TOO_LONG"),
        ],
    )
    def test_duration_rules(self, teacher_api: Api, start: str, end: str, code: str) -> None:
        assignment = create_assignment(teacher_api)

        error(_schedule(teacher_api, assignment["id"], 1, start, end), 422, code)

    @pytest.mark.parametrize(
        "data",
        [
            {"weekday": 0, "start_time": "07:00", "end_time": "09:00"},
            {"weekday": 8, "start_time": "07:00", "end_time": "09:00"},
            {"weekday": 1, "start_time": "7:00", "end_time": "09:00"},
            {"weekday": 1, "start_time": "07:00:30", "end_time": "09:00"},
            {"weekday": 1, "start_time": "07:00 p. m.", "end_time": "09:00"},
        ],
    )
    def test_rejects_malformed_input(self, teacher_api: Api, data: dict[str, object]) -> None:
        assignment = create_assignment(teacher_api)

        error(
            teacher_api.post(f"/assignments/{assignment['id']}/schedules", data),
            422,
            "VALIDATION_ERROR",
        )

    def test_inactive_assignment_cannot_get_schedules(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        error(
            _schedule(teacher_api, assignment["id"], 1, "07:00", "09:00"),
            422,
            "ASSIGNMENT_INACTIVE",
        )


class TestUpdateAndDelete:
    def test_update_does_not_conflict_with_itself(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        schedule = add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")

        updated = ok(teacher_api.patch(f"/schedules/{schedule['id']}", {"end_time": "09:30"}))

        assert (updated["start_time"], updated["end_time"]) == ("07:00", "09:30")

    def test_update_into_another_class_is_rejected(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")
        later = add_schedule(teacher_api, assignment["id"], 1, "10:00", "12:00")

        error(
            teacher_api.patch(f"/schedules/{later['id']}", {"start_time": "08:00"}),
            409,
            "SCHEDULE_OVERLAP",
        )

    def test_delete(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        schedule = add_schedule(teacher_api, assignment["id"], 1, "07:00", "09:00")

        assert teacher_api.delete(f"/schedules/{schedule['id']}").status_code == 204
        error(teacher_api.delete(f"/schedules/{schedule['id']}"), 404, "SCHEDULE_NOT_FOUND")


def test_weekly_schedule_groups_by_day_in_order(teacher_api: Api) -> None:
    databases = create_assignment(teacher_api, "Bases de Datos")
    networks = create_assignment(teacher_api, "Redes", career="LADM", rate="145.00")
    add_schedule(teacher_api, databases["id"], 3, "12:00", "14:00")
    add_schedule(teacher_api, networks["id"], 1, "10:00", "11:00")
    add_schedule(teacher_api, databases["id"], 1, "07:00", "09:00")
    retired = create_assignment(teacher_api, "Química")
    add_schedule(teacher_api, retired["id"], 2, "07:00", "09:00")
    ok(teacher_api.post(f"/assignments/{retired['id']}/deactivate"))

    weekly = ok(teacher_api.get("/schedules/weekly"))

    assert [day["weekday"] for day in weekly["days"]] == [1, 2, 3, 4, 5, 6, 7]
    monday = weekly["days"][0]
    assert [c["assignment"]["subject_name"] for c in monday["classes"]] == [
        "Bases de Datos",
        "Redes",
    ]
    assert monday["total_minutes"] == 180
    assert weekly["days"][1]["classes"] == []
    assert weekly["total_minutes"] == 300
    assert weekly["total_hours"] == "5.00"


def _batch(api: Api, assignment_id: str, *ranges: tuple[list[int], str, str]) -> Response:
    return api.post(
        f"/assignments/{assignment_id}/schedules/batch",
        {
            "ranges": [
                {"weekdays": days, "start_time": start, "end_time": end}
                for days, start, end in ranges
            ]
        },
    )


def _weekly(api: Api) -> list[tuple[int, str, str]]:
    days = ok(api.get("/schedules/weekly"))["days"]
    return [
        (day["weekday"], item["start_time"], item["end_time"])
        for day in days
        for item in day["classes"]
    ]


class TestBatch:
    """RN-42: varios días y rangos en una captura, todo o nada."""

    def test_creates_every_day_of_every_range(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)

        created = ok(
            _batch(
                teacher_api,
                assignment["id"],
                ([5, 1, 3], "07:00", "09:00"),
                ([2], "16:00", "18:00"),
            ),
            201,
        )

        assert [(item["weekday"], item["start_time"]) for item in created] == [
            (1, "07:00"),
            (2, "16:00"),
            (3, "07:00"),
            (5, "07:00"),
        ]
        refreshed = ok(teacher_api.get(f"/assignments/{assignment['id']}"))
        assert refreshed["weekly_hours"] == "8.00"

    def test_same_class_twice_on_the_same_day(self, teacher_api: Api) -> None:
        """Dos bloques el mismo día a horas distintas (por ejemplo, mañana y tarde)."""
        assignment = create_assignment(teacher_api)

        ok(
            _batch(teacher_api, assignment["id"], ([1], "07:00", "09:00"), ([1], "14:00", "16:00")),
            201,
        )

        assert _weekly(teacher_api) == [(1, "07:00", "09:00"), (1, "14:00", "16:00")]

    def test_two_groups_of_the_same_subject_on_the_same_day(self, teacher_api: Api) -> None:
        subject = create_subject(teacher_api)
        payload = {"subject_id": subject["id"], "career_code": "ISC", "hourly_rate": "125.00"}
        morning = ok(teacher_api.post("/assignments", payload | {"group": "3101"}), 201)
        evening = ok(teacher_api.post("/assignments", payload | {"group": "3102"}), 201)

        ok(_batch(teacher_api, morning["id"], ([2, 4], "07:00", "09:00")), 201)
        ok(_batch(teacher_api, evening["id"], ([2, 4], "14:00", "16:00")), 201)

        tuesday = ok(teacher_api.get("/schedules/weekly"))["days"][1]["classes"]
        assert [item["assignment"]["group"] for item in tuesday] == ["3101", "3102"]

    def test_overlap_with_another_class_saves_nothing_and_names_day_and_class(
        self, teacher_api: Api
    ) -> None:
        databases = create_assignment(teacher_api, "Bases de Datos")
        add_schedule(teacher_api, databases["id"], 3, "08:00", "10:00")
        networks = create_assignment(teacher_api, "Redes", career="IIND")

        body = error(
            _batch(teacher_api, networks["id"], ([1, 3, 5], "07:00", "09:00")),
            409,
            "SCHEDULE_OVERLAP",
        )

        assert body["message"] == (
            "El miércoles, 07:00–09:00 se empalma con Bases de Datos (Ingeniería en Sistemas "
            "Computacionales), de 08:00–10:00. No se guardó ningún horario. Elige otra hora de "
            "entrada o de salida para ese día."
        )
        assert (body["details"]["weekday"], body["details"]["all_or_nothing"]) == (3, True)
        (conflict,) = body["details"]["conflicts"]
        assert (conflict["subject_name"], conflict["career_code"]) == ("Bases de Datos", "ISC")
        assert _weekly(teacher_api) == [(3, "08:00", "10:00")]

    def test_ranges_of_the_same_capture_cannot_overlap(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)

        body = error(
            _batch(
                teacher_api, assignment["id"], ([1, 2], "07:00", "09:00"), ([2], "08:00", "10:00")
            ),
            422,
            "SCHEDULE_RANGES_OVERLAP",
        )

        assert body["details"]["weekday"] == 2
        assert _weekly(teacher_api) == []

    def test_an_invalid_range_saves_nothing(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)

        error(
            _batch(teacher_api, assignment["id"], ([1], "07:00", "09:00"), ([2], "09:00", "09:10")),
            422,
            "CLASS_TOO_SHORT",
        )

        assert _weekly(teacher_api) == []

    @pytest.mark.parametrize(
        "ranges",
        [
            [],
            [{"weekdays": [], "start_time": "07:00", "end_time": "09:00"}],
            [{"weekdays": [1, 1], "start_time": "07:00", "end_time": "09:00"}],
            [{"weekdays": [8], "start_time": "07:00", "end_time": "09:00"}],
            [{"weekdays": [1], "start_time": "07:00", "end_time": "09:00"}] * 8,
        ],
    )
    def test_malformed_captures_are_rejected(
        self, teacher_api: Api, ranges: list[dict[str, object]]
    ) -> None:
        assignment = create_assignment(teacher_api)

        error(
            teacher_api.post(
                f"/assignments/{assignment['id']}/schedules/batch", {"ranges": ranges}
            ),
            422,
            "VALIDATION_ERROR",
        )

    def test_inactive_or_foreign_assignment(self, teacher_api: Api, other_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        error(
            _batch(teacher_api, assignment["id"], ([1], "07:00", "09:00")),
            422,
            "ASSIGNMENT_INACTIVE",
        )
        error(
            _batch(other_api, assignment["id"], ([1], "07:00", "09:00")),
            404,
            "ASSIGNMENT_NOT_FOUND",
        )
