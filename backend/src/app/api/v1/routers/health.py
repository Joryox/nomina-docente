from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.v1.dependencies import get_health_service
from app.schemas.health import HealthResponse
from app.services.health import HealthService

router = APIRouter(prefix="/health", tags=["salud"])


@router.get("", summary="Estado de la API y de la base de datos")
def get_health(service: Annotated[HealthService, Depends(get_health_service)]) -> HealthResponse:
    return service.check()
