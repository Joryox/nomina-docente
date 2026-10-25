import uuid
from http import HTTPStatus

from fastapi import APIRouter, Response

from app.api.v1.dependencies import CurrentTeacher, ScheduleServiceDep
from app.api.v1.openapi import business_responses
from app.core.codes import ErrorCode
from app.schemas.schedules import ScheduleResponse, ScheduleUpdate, WeeklyScheduleResponse

router = APIRouter(prefix="/schedules", tags=["horarios"])

NOT_FOUND = ErrorCode.SCHEDULE_NOT_FOUND


@router.get(
    "/weekly",
    summary="Consultar mi horario semanal",
    description="Clases de las asignaciones activas agrupadas por día (siempre los 7 días) y "
    "ordenadas por hora de entrada, listas para una vista semanal.",
    responses=business_responses(),
)
def get_weekly_schedule(
    teacher: CurrentTeacher, service: ScheduleServiceDep
) -> WeeklyScheduleResponse:
    return service.weekly(teacher)


@router.patch(
    "/{schedule_id}",
    summary="Editar un horario",
    description="Cambia el día, la entrada o la salida, con las mismas validaciones que al "
    "crearlo; no se compara consigo mismo.",
    responses=business_responses(
        NOT_FOUND,
        ErrorCode.SCHEDULE_OVERLAP,
        ErrorCode.TIME_RANGE_INVALID,
        ErrorCode.CLASS_TOO_SHORT,
        ErrorCode.CLASS_TOO_LONG,
        writes=True,
    ),
)
def update_schedule(
    schedule_id: uuid.UUID,
    data: ScheduleUpdate,
    teacher: CurrentTeacher,
    service: ScheduleServiceDep,
) -> ScheduleResponse:
    return service.update(teacher, schedule_id, data)


@router.delete(
    "/{schedule_id}",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Borrar un horario",
    description="Quita la clase del horario semanal. La bitácora ya registrada no cambia.",
    responses=business_responses(NOT_FOUND, writes=True),
)
def delete_schedule(
    schedule_id: uuid.UUID, teacher: CurrentTeacher, service: ScheduleServiceDep
) -> Response:
    service.delete(teacher, schedule_id)
    return Response(status_code=HTTPStatus.NO_CONTENT)
