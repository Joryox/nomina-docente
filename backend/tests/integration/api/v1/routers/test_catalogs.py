import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.constants import API_V1_PREFIX
from app.models import Career
from tests.business import TODAY, Api, ok

pytestmark = pytest.mark.db


def test_careers_lists_only_active_careers_sorted_by_name(
    teacher_api: Api, seeded_session: Session, career: Career
) -> None:
    career.is_active = False
    seeded_session.flush()

    page = ok(teacher_api.get("/catalogs/careers"))

    codes = [item["code"] for item in page["items"]]
    assert career.code not in codes
    assert len(codes) == 6
    names = [item["name"] for item in page["items"]]
    assert names == sorted(names)
    assert page["items"][0]["career_type"]["code"] in {"engineering", "bachelor"}
    assert (page["page"], page["total_items"], page["total_pages"]) == (1, 6, 1)


def test_hourly_rates_are_decimal_strings_in_ascending_order(teacher_api: Api) -> None:
    page = ok(teacher_api.get("/catalogs/hourly-rates"))

    assert [item["amount"] for item in page["items"]] == ["125.00", "135.00", "145.00"]


def test_pagination_is_standard(teacher_api: Api) -> None:
    page = ok(teacher_api.get("/catalogs/careers", page=2, page_size=3))

    assert (page["page"], page["page_size"], page["total_items"], page["total_pages"]) == (
        2,
        3,
        7,
        3,
    )
    assert len(page["items"]) == 3


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}])
def test_rejects_invalid_pagination(teacher_api: Api, params: dict[str, int]) -> None:
    response = teacher_api.get("/catalogs/careers", **params)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_business_rules_publish_the_configured_limits(teacher_api: Api) -> None:
    rules = ok(teacher_api.get("/catalogs/business-rules"))

    assert rules["today"] == TODAY.isoformat()
    assert rules["timezone"] == "America/Mexico_City"
    assert rules["class_min_duration_minutes"] == 30
    assert rules["class_max_duration_minutes"] == 300
    assert rules["logbook_max_age_days"] == 30
    assert rules["payroll_issue_requires_closed_period"] is True
    assert rules["afternoon_shift_start"] == "14:00"
    assert rules["schedule_batch_max_ranges"] == 7


def test_catalogs_require_a_session(db_client: TestClient) -> None:
    response = db_client.get(f"{API_V1_PREFIX}/catalogs/careers")

    assert response.status_code == 401
