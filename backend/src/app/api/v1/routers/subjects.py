import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.v1.dependencies import CurrentTeacher, Pagination, SubjectServiceDep
from app.api.v1.openapi import business_responses
from app.core.codes import ErrorCode
from app.core.constants import SEARCH_TERM_MAX_LENGTH
from app.schemas.common import StatusFilter
from app.schemas.subjects import (
    SubjectCreate,
    SubjectPage,
    SubjectRemovalResponse,
    SubjectResponse,
    SubjectUpdate,
)

router = APIRouter(prefix="/subjects", tags=["materias"])

NOT_FOUND = ErrorCode.SUBJECT_NOT_FOUND


@router.get(
    "",
    summary="Listar mis materias",
    description="Materias del docente ordenadas por nombre. `search` busca en el nombre (sin "
    "distinguir mayúsculas ni acentos) y en la clave.",
    responses=business_responses(),
)
def list_subjects(
    teacher: CurrentTeacher,
    service: SubjectServiceDep,
    page: Pagination,
    search: Annotated[str | None, Query(max_length=SEARCH_TERM_MAX_LENGTH)] = None,
    status: StatusFilter = StatusFilter.ACTIVE,
) -> SubjectPage:
    return service.search(teacher, search=search, status=status, page=page)


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    summary="Registrar una materia",
    description="El nombre se guarda con espacios simples y mayúsculas coherentes "
    "(«bases   de datos» → «Bases de Datos»). No se permiten dos materias con el mismo nombre "
    "sin distinguir mayúsculas, acentos ni espacios (RN-09).",
    responses=business_responses(ErrorCode.SUBJECT_ALREADY_EXISTS, writes=True),
)
def create_subject(
    data: SubjectCreate, teacher: CurrentTeacher, service: SubjectServiceDep
) -> SubjectResponse:
    return service.create(teacher, data)


@router.get(
    "/{subject_id}",
    summary="Consultar una materia",
    description="Una materia del docente. Si es de otro docente responde 404 (RN-04).",
    responses=business_responses(NOT_FOUND),
)
def get_subject(
    subject_id: uuid.UUID, teacher: CurrentTeacher, service: SubjectServiceDep
) -> SubjectResponse:
    return service.get(teacher, subject_id)


@router.patch(
    "/{subject_id}",
    summary="Editar una materia",
    description="Cambia el nombre o la clave. El nombre nuevo tampoco puede repetirse.",
    responses=business_responses(NOT_FOUND, ErrorCode.SUBJECT_ALREADY_EXISTS, writes=True),
)
def update_subject(
    subject_id: uuid.UUID, data: SubjectUpdate, teacher: CurrentTeacher, service: SubjectServiceDep
) -> SubjectResponse:
    return service.update(teacher, subject_id, data)


@router.delete(
    "/{subject_id}",
    summary="Quitar una materia",
    description="Si la materia nunca se usó en una asignación, se borra (`deleted`). Si ya "
    "tiene historial, no se borra: se desactiva (`deactivated`) y deja de aparecer en los "
    "selectores. Con asignaciones activas responde 409: primero hay que desactivarlas.",
    responses=business_responses(NOT_FOUND, ErrorCode.SUBJECT_HAS_ACTIVE_ASSIGNMENTS, writes=True),
)
def remove_subject(
    subject_id: uuid.UUID, teacher: CurrentTeacher, service: SubjectServiceDep
) -> SubjectRemovalResponse:
    return service.remove(teacher, subject_id)


@router.post(
    "/{subject_id}/reactivate",
    summary="Reactivar una materia",
    description="Vuelve a mostrar en los selectores una materia desactivada. Es idempotente.",
    responses=business_responses(NOT_FOUND, writes=True),
)
def reactivate_subject(
    subject_id: uuid.UUID, teacher: CurrentTeacher, service: SubjectServiceDep
) -> SubjectResponse:
    return service.reactivate(teacher, subject_id)
