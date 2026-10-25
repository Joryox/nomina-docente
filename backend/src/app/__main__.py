"""Arranca el servidor de desarrollo con el host y el puerto de la configuración.

Uso: ``uv run python -m app``
"""

import uvicorn

from app.core.config import Environment, get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.app_env is Environment.DEVELOPMENT,
        log_config=None,
    )


if __name__ == "__main__":
    main()
