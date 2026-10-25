from fastapi import APIRouter

from app.api.v1.dependencies import CurrentTeacher, DashboardServiceDep
from app.api.v1.openapi import business_responses
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["panel"])


@router.get(
    "/summary",
    summary="Resumen del panel principal",
    description="Horas y monto estimado de la quincena actual, clases de hoy (registradas y "
    "pendientes), clases ya concluidas de la quincena sin registrar y los últimos recibos.",
    responses=business_responses(),
)
def get_summary(teacher: CurrentTeacher, service: DashboardServiceDep) -> DashboardSummaryResponse:
    return service.summary(teacher)
