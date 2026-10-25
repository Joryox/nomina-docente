"""Logging estructurado en JSON, con el identificador de la petición en cada registro."""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from app.core.config import LogLevel

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)

# Atributos estándar de LogRecord (y el duplicado con colores de uvicorn) que no se copian
# como campos extra.
_RESERVED_ATTRIBUTES = frozenset(vars(logging.makeLogRecord({})).keys()) | {
    "message",
    "color_message",
}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = request_id_context.get()
        if request_id is not None:
            payload["request_id"] = request_id
        payload.update(
            {key: value for key, value in vars(record).items() if key not in _RESERVED_ATTRIBUTES}
        )
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: LogLevel) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Uvicorn registra sus propios handlers; se redirigen al formato común.
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
    # El middleware de peticiones ya registra cada acceso con más contexto.
    logging.getLogger("uvicorn.access").disabled = True
