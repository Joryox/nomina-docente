"""Crea la aplicación FastAPI y registra middlewares, manejadores de errores y routers."""

from importlib.metadata import version

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.constants import API_V1_PREFIX, APP_PACKAGE_NAME, CSRF_HEADER, REQUEST_ID_HEADER
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.security.middleware import (
    BodySizeLimitMiddleware,
    CsrfMiddleware,
    SecurityHeadersMiddleware,
)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        description=f"API del {settings.app_name} — {settings.institution_name}",
        version=version(APP_PACKAGE_NAME),
        # En producción no se publica la documentación interactiva.
        openapi_url=None if settings.is_production else f"{API_V1_PREFIX}/openapi.json",
    )

    # Starlette ejecuta primero el último middleware agregado. Orden efectivo, de afuera
    # hacia adentro: contexto → cabeceras de seguridad → CORS → límite de tamaño → CSRF.
    app.add_middleware(
        CsrfMiddleware,
        cookie_name=settings.csrf_cookie_name,
        allowed_origins=settings.cors_origins,
    )
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_request_body_bytes)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", CSRF_HEADER, REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
    )
    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=settings.is_production)
    app.add_middleware(RequestContextMiddleware)

    register_exception_handlers(app)
    app.include_router(api_router)
    return app
