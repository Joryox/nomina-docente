"""Router raíz de la versión 1 de la API."""

from fastapi import APIRouter

from app.api.v1.routers import (
    assignments,
    auth,
    catalogs,
    dashboard,
    health,
    logbook,
    payroll,
    schedules,
    subjects,
)
from app.core.constants import API_V1_PREFIX

api_router = APIRouter(prefix=API_V1_PREFIX)
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(catalogs.router)
api_router.include_router(subjects.router)
api_router.include_router(assignments.router)
api_router.include_router(schedules.router)
api_router.include_router(logbook.router)
api_router.include_router(payroll.router)
api_router.include_router(dashboard.router)
