import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.api.v1.dependencies import (
    AssignmentServiceDep,
    CurrentTeacher,
    Pagination,
    ScheduleServiceDep,
)
from app.api.v1.openapi import business_responses
from app.core.codes import ErrorCode
from app.core.constants import CATALOG_CODE_MAX_LENGTH
from app.schemas.assignments import (
    AssignmentCreate,
    AssignmentPage,
    AssignmentResponse,
    AssignmentUpdate,
)
from app.schemas.common import StatusFilter
from app.schemas.schedules import ScheduleBatchCreate, ScheduleCreate, ScheduleResponse

router = APIRouter(prefix="/assignments", tags=["asignaciones"])

NOT_FOUND = ErrorCode.ASSIGNMENT_NOT_FOUND
SELECTION_ERRORS = (
    ErrorCode.SUBJECT_NOT_FOUND,
    ErrorCode.CAREER_NOT_FOUND,
    ErrorCode.RATE_NOT_FOUND,
    ErrorCode.SUBJECT_INACTIVE,
    ErrorCode.CAREER_INACTIVE,
    ErrorCode.RATE_INACTIVE,
    ErrorCode.ASSIGNMENT_ALREADY_EXISTS,
)


@router.get(
    "",
    summary="Listar mis asignaciones",
    description="Asignaciones con su materia, carrera, tarifa actual y horarios. Filtros: "
    "estado (`active` por defecto), materia y clave de carrera.",
    responses=business_responses(ErrorCode.SUBJECT_NOT_FOUND),
)
def list_assignments(
    teacher: CurrentTeacher,
    service: AssignmentServiceDep,
    page: Pagination,
    status: StatusFilter = StatusFilter.ACTIVE,
    subject_id: uuid.UUID | None = None,
    career_code: Annotated[str | None, Query(max_length=CATALOG_CODE_MAX_LENGTH)] = None,
) -> AssignmentPage:
    return service.search(
        teacher, status=status, subject_id=subject_id, career_code=career_code, page=page
    )


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    summary="Crear una asignación",
    description="Une una materia del docente con una carrera y una tarifa del catálogo "
    "(RN-13). Solo se aceptan materias, carreras y tarifas activas; no puede haber dos "
    "asignaciones activas de la misma materia en la misma carrera (RN-14).",
    responses=business_responses(*SELECTION_ERRORS, writes=True),
)
def create_assignment(
    data: AssignmentCreate, teacher: CurrentTeacher, service: AssignmentServiceDep
) -> AssignmentResponse:
    return service.create(teacher, data)


@router.get(
    "/{assignment_id}",
    summary="Consultar una asignación",
    description="Una asignación del docente con sus horarios. De otro docente: 404 (RN-04).",
    responses=business_responses(NOT_FOUND),
)
def get_assignment(
    assignment_id: uuid.UUID, teacher: CurrentTeacher, service: AssignmentServiceDep
) -> AssignmentResponse:
    return service.get(teacher, assignment_id)


@router.patch(
    "/{assignment_id}",
    summary="Editar una asignación",
    description="Cambiar la **tarifa** siempre se permite y solo afecta a las sesiones que se "
    "registren después: cada sesión conserva la tarifa con la que se registró y los recibos "
    "emitidos no cambian. Cambiar la materia o la carrera solo se permite si la asignación no "
    "tiene bitácora (`ASSIGNMENT_HAS_LOGBOOK`).",
    responses=business_responses(
        NOT_FOUND,
        *SELECTION_ERRORS,
        ErrorCode.ASSIGNMENT_INACTIVE,
        ErrorCode.ASSIGNMENT_HAS_LOGBOOK,
        writes=True,
    ),
)
def update_assignment(
    assignment_id: uuid.UUID,
    data: AssignmentUpdate,
    teacher: CurrentTeacher,
    service: AssignmentServiceDep,
) -> AssignmentResponse:
    return service.update(teacher, assignment_id, data)


@router.post(
    "/{assignment_id}/deactivate",
    summary="Desactivar una asignación",
    description="Guarda hoy como su último día activo y elimina sus horarios; la bitácora y "
    "los recibos se conservan. Se pueden registrar sesiones con fecha hasta ese día. Es "
    "idempotente.",
    responses=business_responses(NOT_FOUND, writes=True),
)
def deactivate_assignment(
    assignment_id: uuid.UUID, teacher: CurrentTeacher, service: AssignmentServiceDep
) -> AssignmentResponse:
    return service.deactivate(teacher, assignment_id)


@router.post(
    "/{assignment_id}/reactivate",
    summary="Reactivar una asignación",
    description="Requiere que su materia, carrera y tarifa sigan activas y que no exista otra "
    "asignación activa de la misma materia y carrera. Los horarios se vuelven a capturar.",
    responses=business_responses(NOT_FOUND, *SELECTION_ERRORS, writes=True),
)
def reactivate_assignment(
    assignment_id: uuid.UUID, teacher: CurrentTeacher, service: AssignmentServiceDep
) -> AssignmentResponse:
    return service.reactivate(teacher, assignment_id)


@router.delete(
    "/{assignment_id}",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Borrar una asignación",
    description="Solo si no tiene sesiones en la bitácora (RN-15); sus horarios se borran con "
    "ella. Con bitácora responde 409 `ASSIGNMENT_HAS_LOGBOOK`: hay que desactivarla.",
    responses=business_responses(NOT_FOUND, ErrorCode.ASSIGNMENT_HAS_LOGBOOK, writes=True),
)
def delete_assignment(
    assignment_id: uuid.UUID, teacher: CurrentTeacher, service: AssignmentServiceDep
) -> Response:
    service.delete(teacher, assignment_id)
    return Response(status_code=HTTPStatus.NO_CONTENT)


@router.get(
    "/{assignment_id}/schedules",
    summary="Listar los horarios de una asignación",
    description="Horarios semanales de la asignación, por día y hora de entrada.",
    tags=["horarios"],
    responses=business_responses(NOT_FOUND),
)
def list_schedules(
    assignment_id: uuid.UUID, teacher: CurrentTeacher, service: ScheduleServiceDep
) -> list[ScheduleResponse]:
    return service.list_for_assignment(teacher, assignment_id)


@router.post(
    "/{assignment_id}/schedules",
    status_code=HTTPStatus.CREATED,
    summary="Agregar un horario",
    description="Día ISO (1 = lunes … 7 = domingo), entrada y salida en `HH:MM`. La salida "
    "debe ser posterior a la entrada, la duración debe estar entre los límites configurados "
    "y no puede empalmarse con **ninguna** otra clase del docente (RN-17, RN-18); el error "
    "dice con qué clase choca.",
    tags=["horarios"],
    responses=business_responses(
        NOT_FOUND,
        ErrorCode.ASSIGNMENT_INACTIVE,
        ErrorCode.SCHEDULE_OVERLAP,
        ErrorCode.TIME_RANGE_INVALID,
        ErrorCode.CLASS_TOO_SHORT,
        ErrorCode.CLASS_TOO_LONG,
        writes=True,
    ),
)
def create_schedule(
    assignment_id: uuid.UUID,
    data: ScheduleCreate,
    teacher: CurrentTeacher,
    service: ScheduleServiceDep,
) -> ScheduleResponse:
    return service.create(teacher, assignment_id, data)


@router.post(
    "/{assignment_id}/schedules/batch",
    status_code=HTTPStatus.CREATED,
    summary="Agregar horarios de varios días",
    description="Uno o más rangos de horas, cada uno con los días en que se repite (por "
    "ejemplo lunes, miércoles y viernes de 07:00 a 09:00). Se guardan **todos o ninguno** "
    "(RN-42): si un día choca con otra clase, el error dice qué día y con qué clase, y no se "
    "guarda nada. Dos rangos de la misma captura tampoco pueden cruzarse el mismo día.",
    tags=["horarios"],
    responses=business_responses(
        NOT_FOUND,
        ErrorCode.ASSIGNMENT_INACTIVE,
        ErrorCode.SCHEDULE_OVERLAP,
        ErrorCode.SCHEDULE_RANGES_OVERLAP,
        ErrorCode.TIME_RANGE_INVALID,
        ErrorCode.CLASS_TOO_SHORT,
        ErrorCode.CLASS_TOO_LONG,
        writes=True,
    ),
)
def create_schedules(
    assignment_id: uuid.UUID,
    data: ScheduleBatchCreate,
    teacher: CurrentTeacher,
    service: ScheduleServiceDep,
) -> list[ScheduleResponse]:
    return service.create_many(teacher, assignment_id, data)
