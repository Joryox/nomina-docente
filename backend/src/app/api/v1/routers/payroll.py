import uuid
from http import HTTPStatus

from fastapi import APIRouter, Response

from app.api.v1.dependencies import CurrentTeacher, Pagination, PayrollServiceDep
from app.api.v1.openapi import business_responses
from app.api.v1.params import PeriodParams, YearQuery
from app.core.codes import ErrorCode
from app.core.constants import RECEIPT_PDF_MEDIA_TYPE
from app.domain.periods import Period
from app.schemas.payroll import (
    PayrollPreviewResponse,
    PeriodListResponse,
    ReceiptCreate,
    ReceiptDetailResponse,
    ReceiptPage,
)

router = APIRouter(prefix="/payroll", tags=["nómina"])


@router.get(
    "/periods",
    summary="Quincenas de un año",
    description="Las 24 quincenas del año con sus fechas exactas (RN-24) y su estado: "
    "`future`, `open` (en curso), `closed` (terminó sin recibo) o `issued`.",
    responses=business_responses(),
)
def list_periods(
    year: YearQuery, teacher: CurrentTeacher, service: PayrollServiceDep
) -> PeriodListResponse:
    return service.periods(teacher, year)


@router.get(
    "/preview",
    summary="Vista previa del recibo",
    description="Calcula en vivo, a partir de la bitácora del periodo, las horas, la tarifa y "
    "el importe por asignación y el total bruto (RN-25, RN-26). Incluye advertencias (clases "
    "programadas sin registrar, sesiones fuera de horario, cambio de tarifa, periodo en curso) "
    "y, en `issue_blockers`, por qué no se puede emitir todavía.",
    responses=business_responses(),
)
def get_preview(
    period: PeriodParams, teacher: CurrentTeacher, service: PayrollServiceDep
) -> PayrollPreviewResponse:
    return service.preview(teacher, period)


@router.get(
    "/receipts",
    summary="Listar mis recibos",
    description="Recibos emitidos, del más reciente al más antiguo; `year` filtra por año.",
    responses=business_responses(),
)
def list_receipts(
    teacher: CurrentTeacher,
    service: PayrollServiceDep,
    page: Pagination,
    year: YearQuery | None = None,
) -> ReceiptPage:
    return service.list_receipts(teacher, year=year, page=page)


@router.post(
    "/receipts",
    status_code=HTTPStatus.CREATED,
    summary="Emitir el recibo de una quincena",
    description="Guarda una copia fija del recibo con folio consecutivo y bloquea la bitácora "
    "del periodo (RN-28). Solo periodos terminados (o en curso, si la configuración lo "
    "permite), sin recibo previo y con al menos una sesión (RN-29). Los totales coinciden "
    "exactamente con la vista previa. Seguro ante peticiones simultáneas: solo una emite.",
    responses=business_responses(
        ErrorCode.RECEIPT_ALREADY_ISSUED,
        ErrorCode.PERIOD_IN_FUTURE,
        ErrorCode.PERIOD_NOT_FINISHED,
        ErrorCode.PERIOD_WITHOUT_SESSIONS,
        writes=True,
    ),
)
def issue_receipt(
    data: ReceiptCreate, teacher: CurrentTeacher, service: PayrollServiceDep
) -> ReceiptDetailResponse:
    return service.issue(teacher, Period(data.year, data.month, data.fortnight))


@router.get(
    "/receipts/{receipt_id}",
    summary="Consultar un recibo",
    description="Todo lo que lleva el recibo impreso: institución, docente, periodo, folio, "
    "fecha de emisión, renglones y totales. De otro docente: 404 (RN-04).",
    responses=business_responses(ErrorCode.RECEIPT_NOT_FOUND),
)
def get_receipt(
    receipt_id: uuid.UUID, teacher: CurrentTeacher, service: PayrollServiceDep
) -> ReceiptDetailResponse:
    return service.get_receipt(teacher, receipt_id)


@router.get(
    "/receipts/{receipt_id}/pdf",
    summary="Descargar el recibo en PDF",
    description="El recibo emitido en tamaño carta, con el mismo contenido que su detalle: "
    "encabezado institucional, folio, periodo, docente, conceptos, total con letra y espacios "
    "de firma. El nombre del archivo lleva el folio y el periodo. De otro docente: 404 (RN-04).",
    response_class=Response,
    responses={
        HTTPStatus.OK: {
            "content": {RECEIPT_PDF_MEDIA_TYPE: {"schema": {"type": "string", "format": "binary"}}},
            "description": "Archivo PDF",
        },
        **business_responses(ErrorCode.RECEIPT_NOT_FOUND),
    },
)
def download_receipt_pdf(
    receipt_id: uuid.UUID, teacher: CurrentTeacher, service: PayrollServiceDep
) -> Response:
    document = service.receipt_pdf(teacher, receipt_id)
    return Response(
        content=document.content,
        media_type=RECEIPT_PDF_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )
