"""Recibo en PDF (RN-27): mismo contenido que el detalle, nombre con folio y periodo."""

from io import BytesIO
from typing import Any

import pytest
from pypdf import PdfReader

from tests.business import LAST_MONDAY_OF_Q1, Api, create_assignment, error, logged, ok

Q1 = {"year": 2026, "month": 10, "fortnight": 1}

pytestmark = pytest.mark.db


@pytest.fixture
def receipt(teacher_api: Api) -> dict[str, Any]:
    databases = create_assignment(teacher_api, "Bases de Datos", "ISC", "125.00")
    logged(teacher_api, databases["id"], LAST_MONDAY_OF_Q1, "07:00", "09:00")
    issued: dict[str, Any] = ok(teacher_api.post("/payroll/receipts", Q1), 201)
    return issued


def _text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    return " ".join(page.extract_text() for page in reader.pages)


def test_detail_includes_the_total_in_words(teacher_api: Api, receipt: dict[str, Any]) -> None:
    detail = ok(teacher_api.get(f"/payroll/receipts/{receipt['id']}"))

    assert detail["total_amount"] == "250.00"
    assert detail["total_amount_words"] == "Doscientos cincuenta pesos 00/100 M.N."
    assert detail["total_amount_words"] == receipt["total_amount_words"]


def test_pdf_has_the_receipt_content_and_a_descriptive_filename(
    teacher_api: Api, receipt: dict[str, Any]
) -> None:
    response = teacher_api.get(f"/payroll/receipts/{receipt['id']}/pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="recibo-{receipt["folio"]}-2026-10-q1.pdf"'
    )
    assert response.content.startswith(b"%PDF")
    text = _text(response.content)
    for expected in (
        "Recibo de Nómina",
        receipt["folio"],
        "1.ª quincena de octubre de 2026",
        receipt["teacher"]["full_name"],
        "Bases de Datos",
        "Nombre y firma del docente",
        "Nombre y firma de quien autoriza",
    ):
        assert expected in text, expected
    assert "Doscientos cincuenta pesos 00/100 M.N." in text
    assert "$250.00 MXN" in text


def test_pdf_of_another_teacher_is_not_found(
    teacher_api: Api, other_api: Api, receipt: dict[str, Any]
) -> None:
    error(other_api.get(f"/payroll/receipts/{receipt['id']}/pdf"), 404, "RECEIPT_NOT_FOUND")
