"""Router raíz de la versión 1 de la API."""

from fastapi import APIRouter

from app.api.v1.routers import auth, health
from app.core.constants import API_V1_PREFIX

api_router = APIRouter(prefix=API_V1_PREFIX)
api_router.include_router(health.router)
api_router.include_router(auth.router)
