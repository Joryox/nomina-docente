"""Contrato de la respuesta del endpoint de salud."""

from enum import StrEnum

from pydantic import BaseModel


class ServiceStatus(StrEnum):
    OK = "ok"
    DEGRADED = "degraded"


class DatabaseStatus(StrEnum):
    OK = "ok"
    UNAVAILABLE = "unavailable"


class HealthResponse(BaseModel):
    status: ServiceStatus
    database: DatabaseStatus
    version: str
    environment: str
