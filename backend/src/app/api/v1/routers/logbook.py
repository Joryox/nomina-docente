import uuid
from datetime import date
from http import HTTPStatus

from fastapi import APIRouter, Response

from app.api.v1.dependencies import CurrentTeacher, LogbookServiceDep, Pagination
from app.api.v1.openapi import business_responses
from app.api.v1.params import OptionalPeriodParams
from app.core.codes import ErrorCode
from app.schemas.logbook import (
    LogbookEntryCreate,
    LogbookEntryResponse,
    LogbookEntryResult,
    LogbookEntryUpdate,
    LogbookPage,
    QuickLogbookRequest,
    QuickLogbookResponse,
    ScheduledClassesResponse,
)

router = APIRouter(prefix="/logbook", tags=["bitácora"])

NOT_FOUND = ErrorCode.LOGBOOK_ENTRY_NOT_FOUND
SESSION_RULES = (
    ErrorCode.TIME_RANGE_INVALID,
    ErrorCode.CLASS_TOO_SHORT,
    ErrorCode.CLASS_TOO_LONG,
    ErrorCode.SESSION_DATE_IN_FUTURE,
    ErrorCode.SESSION_NOT_FINISHED,
    ErrorCode.SESSION_DATE_TOO_OLD,
    ErrorCode.ASSIGNMENT_INACTIVE_ON_DATE,
    ErrorCode.PERIOD_LOCKED,
    ErrorCode.SESSION_OVERLAP,
)


@router.get(
    "",
    summary="Consultar mi bitácora",
    description="Sesiones registradas, de la más reciente a la más antigua. Filtros: rango "
    "de fechas (`date_from`, `date_to`), asignación y quincena (`year`, `month` y "
    "`fortnight` juntos). `totals` resume todo el filtro, no solo la página.",
    responses=business_responses(ErrorCode.ASSIGNMENT_NOT_FOUND),
)
def list_logbook(
    teacher: CurrentTeacher,
    service: LogbookServiceDep,
    page: Pagination,
    period: OptionalPeriodParams,
    date_from: date | None = None,
    date_to: date | None = None,
    assignment_id: uuid.UUID | None = None,
) -> LogbookPage:
    return service.search(
        teacher,
        date_from=date_from,
        date_to=date_to,
        assignment_id=assignment_id,
        period=period,
        page=page,
    )


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    summary="Registrar una sesión impartida",
    description="Las horas y el importe los calcula el servidor; la sesión guarda la tarifa "
    "vigente de la asignación. Si no coincide con el horario programado se registra igual y "
    "la respuesta incluye una advertencia (`warnings`).",
    responses=business_responses(ErrorCode.ASSIGNMENT_NOT_FOUND, *SESSION_RULES, writes=True),
)
def create_entry(
    data: LogbookEntryCreate, teacher: CurrentTeacher, service: LogbookServiceDep
) -> LogbookEntryResult:
    return service.create(teacher, data)


@router.get(
    "/scheduled",
    summary="Clases programadas para una fecha",
    description="Clases del horario semanal para el día de la semana de `date`, con entrada "
    "y salida precargadas (RN-21), si ya terminaron (`is_due`) y si ya están registradas.",
    responses=business_responses(),
)
def get_scheduled_classes(
    date: date, teacher: CurrentTeacher, service: LogbookServiceDep
) -> ScheduledClassesResponse:
    return service.scheduled_for_date(teacher, date)


@router.post(
    "/quick",
    status_code=HTTPStatus.CREATED,
    summary="Registro rápido de varias clases",
    description="Registra varias clases programadas de una fecha en una sola transacción: "
    "**todo o nada**. Cada elemento indica el horario y, si cambió, la entrada o la salida. "
    "Si una falla, no se registra ninguna y `details.entry_index` dice cuál.",
    responses=business_responses(
        ErrorCode.SCHEDULE_NOT_FOUND, ErrorCode.SCHEDULE_NOT_ON_DATE, *SESSION_RULES, writes=True
    ),
)
def quick_register(
    data: QuickLogbookRequest, teacher: CurrentTeacher, service: LogbookServiceDep
) -> QuickLogbookResponse:
    return service.quick_register(teacher, data)


@router.get(
    "/{entry_id}",
    summary="Consultar una sesión",
    description="Una sesión de la bitácora del docente. De otro docente: 404 (RN-04).",
    responses=business_responses(NOT_FOUND),
)
def get_entry(
    entry_id: uuid.UUID, teacher: CurrentTeacher, service: LogbookServiceDep
) -> LogbookEntryResponse:
    return service.get(teacher, entry_id)


@router.patch(
    "/{entry_id}",
    summary="Editar una sesión",
    description="Solo si su quincena no tiene recibo emitido (RN-23). Revalida fecha, horas, "
    "asignación y empalmes si cambian; la antigüedad máxima aplica al cambiar la fecha.",
    responses=business_responses(
        NOT_FOUND, ErrorCode.ASSIGNMENT_NOT_FOUND, *SESSION_RULES, writes=True
    ),
)
def update_entry(
    entry_id: uuid.UUID,
    data: LogbookEntryUpdate,
    teacher: CurrentTeacher,
    service: LogbookServiceDep,
) -> LogbookEntryResult:
    return service.update(teacher, entry_id, data)


@router.delete(
    "/{entry_id}",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Borrar una sesión",
    description="Solo si su quincena no tiene recibo emitido (RN-23).",
    responses=business_responses(NOT_FOUND, ErrorCode.PERIOD_LOCKED, writes=True),
)
def delete_entry(
    entry_id: uuid.UUID, teacher: CurrentTeacher, service: LogbookServiceDep
) -> Response:
    service.delete(teacher, entry_id)
    return Response(status_code=HTTPStatus.NO_CONTENT)
