from typing import Any

from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.repositories.health import HealthRepository
from app.schemas.health import DatabaseStatus, ServiceStatus
from app.services.health import HealthService


class ReachableDatabase(HealthRepository):
    def __init__(self) -> None:
        pass

    def ping(self) -> None:
        return None


class UnreachableDatabase(HealthRepository):
    def __init__(self) -> None:
        pass

    def ping(self) -> None:
        raise OperationalError("SELECT 1", {}, Exception("conexión rechazada"))


def test_reports_ok_when_database_responds(valid_settings_values: dict[str, Any]) -> None:
    service = HealthService(ReachableDatabase(), Settings(_env_file=None, **valid_settings_values))

    result = service.check()

    assert result.status is ServiceStatus.OK
    assert result.database is DatabaseStatus.OK
    assert result.environment == "test"


def test_reports_degraded_when_database_is_unreachable(
    valid_settings_values: dict[str, Any],
) -> None:
    service = HealthService(
        UnreachableDatabase(), Settings(_env_file=None, **valid_settings_values)
    )

    result = service.check()

    assert result.status is ServiceStatus.DEGRADED
    assert result.database is DatabaseStatus.UNAVAILABLE
