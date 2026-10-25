import pytest

from tests.business import Api, create_assignment, create_subject, error, ok

pytestmark = pytest.mark.db


class TestCreate:
    def test_normalizes_spaces_and_capitalization(self, teacher_api: Api) -> None:
        subject = ok(
            teacher_api.post("/subjects", {"name": "  bases   de  datos ", "code": "SCD-1004"}), 201
        )

        assert subject["name"] == "Bases de Datos"
        assert subject["code"] == "SCD-1004"
        assert subject["is_active"] is True
        assert subject["assignment_count"] == 0

    @pytest.mark.parametrize("duplicate", ["BASES DE DATOS", "bases de datos", "Bases  de Dátos"])
    def test_rejects_duplicates_ignoring_case_accents_and_spaces(
        self, teacher_api: Api, duplicate: str
    ) -> None:
        create_subject(teacher_api, "Bases de Datos")

        body = error(
            teacher_api.post("/subjects", {"name": duplicate}), 409, "SUBJECT_ALREADY_EXISTS"
        )

        assert "Bases de Datos" in body["message"]
        assert body["details"]["is_active"] is True

    def test_two_teachers_can_register_the_same_name(
        self, teacher_api: Api, other_api: Api
    ) -> None:
        create_subject(teacher_api, "Cálculo Diferencial")

        assert create_subject(other_api, "Cálculo Diferencial")["name"] == "Cálculo Diferencial"

    @pytest.mark.parametrize(
        "data",
        [
            {},
            {"name": ""},
            {"name": "   "},
            {"name": "x" * 151},
            {"name": "A", "code": "con espacio"},
            {"name": "A", "teacher_id": 1},
        ],
    )
    def test_rejects_invalid_data(self, teacher_api: Api, data: dict[str, object]) -> None:
        error(teacher_api.post("/subjects", data), 422, "VALIDATION_ERROR")


class TestListAndSearch:
    def test_search_ignores_case_and_accents(self, teacher_api: Api) -> None:
        for name in ("Cálculo Diferencial", "Cálculo Integral", "Bases de Datos"):
            create_subject(teacher_api, name)

        page = ok(teacher_api.get("/subjects", search="CALCULO"))

        assert [item["name"] for item in page["items"]] == [
            "Cálculo Diferencial",
            "Cálculo Integral",
        ]
        assert page["total_items"] == 2

    def test_search_treats_wildcards_literally(self, teacher_api: Api) -> None:
        create_subject(teacher_api, "Bases de Datos")

        assert ok(teacher_api.get("/subjects", search="%"))["total_items"] == 0

    def test_lists_by_status(self, teacher_api: Api) -> None:
        kept = create_subject(teacher_api, "Álgebra Lineal")
        assignment = create_assignment(teacher_api, "Química")
        teacher_api.post(f"/assignments/{assignment['id']}/deactivate")
        ok(teacher_api.delete(f"/subjects/{assignment['subject']['id']}"))

        active = ok(teacher_api.get("/subjects"))
        inactive = ok(teacher_api.get("/subjects", status="inactive"))
        everything = ok(teacher_api.get("/subjects", status="all"))

        assert [item["id"] for item in active["items"]] == [kept["id"]]
        assert [item["name"] for item in inactive["items"]] == ["Química"]
        assert everything["total_items"] == 2


class TestUpdate:
    def test_renames_and_clears_the_code(self, teacher_api: Api) -> None:
        subject = ok(teacher_api.post("/subjects", {"name": "Redes", "code": "R-1"}), 201)

        updated = ok(
            teacher_api.patch(
                f"/subjects/{subject['id']}", {"name": "redes de computadoras", "code": None}
            )
        )

        assert updated["name"] == "Redes de Computadoras"
        assert updated["code"] is None

    def test_rename_cannot_collide_with_another_subject(self, teacher_api: Api) -> None:
        create_subject(teacher_api, "Redes")
        other = create_subject(teacher_api, "Sistemas Operativos")

        error(
            teacher_api.patch(f"/subjects/{other['id']}", {"name": "REDES"}),
            409,
            "SUBJECT_ALREADY_EXISTS",
        )

    def test_renaming_to_itself_is_allowed(self, teacher_api: Api) -> None:
        subject = create_subject(teacher_api, "Redes")

        assert (
            ok(teacher_api.patch(f"/subjects/{subject['id']}", {"name": "redes"}))["name"]
            == "Redes"
        )


class TestRemoval:
    def test_unused_subject_is_deleted(self, teacher_api: Api) -> None:
        subject = create_subject(teacher_api)

        result = ok(teacher_api.delete(f"/subjects/{subject['id']}"))

        assert result == {"outcome": "deleted", "subject": None}
        error(teacher_api.get(f"/subjects/{subject['id']}"), 404, "SUBJECT_NOT_FOUND")

    def test_subject_with_active_assignments_is_not_removed(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)

        error(
            teacher_api.delete(f"/subjects/{assignment['subject']['id']}"),
            409,
            "SUBJECT_HAS_ACTIVE_ASSIGNMENTS",
        )

    def test_subject_with_history_is_deactivated_and_can_be_reactivated(
        self, teacher_api: Api
    ) -> None:
        assignment = create_assignment(teacher_api)
        subject_id = assignment["subject"]["id"]
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))

        result = ok(teacher_api.delete(f"/subjects/{subject_id}"))

        assert result["outcome"] == "deactivated"
        assert result["subject"]["is_active"] is False
        body = error(
            teacher_api.post("/subjects", {"name": "bases de datos"}), 409, "SUBJECT_ALREADY_EXISTS"
        )
        assert "reactívala" in body["message"]
        assert ok(teacher_api.post(f"/subjects/{subject_id}/reactivate"))["is_active"] is True

    def test_inactive_subject_cannot_be_used_in_a_new_assignment(self, teacher_api: Api) -> None:
        assignment = create_assignment(teacher_api)
        subject_id = assignment["subject"]["id"]
        ok(teacher_api.post(f"/assignments/{assignment['id']}/deactivate"))
        ok(teacher_api.delete(f"/subjects/{subject_id}"))

        response = teacher_api.post(
            "/assignments",
            {"subject_id": subject_id, "career_code": "IIND", "hourly_rate": "125.00"},
        )

        error(response, 422, "SUBJECT_INACTIVE")
