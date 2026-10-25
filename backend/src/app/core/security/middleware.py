"""Middlewares de endurecimiento HTTP: cabeceras de seguridad, límite de tamaño y CSRF.

Orden en ``create_app`` (de afuera hacia adentro): contexto de petición → cabeceras de
seguridad → CORS → límite de tamaño → CSRF → aplicación. Así toda respuesta, incluidas las
de error de estos middlewares, lleva las cabeceras de seguridad y de CORS.
"""

from collections.abc import Iterable
from http import HTTPStatus

from starlette.datastructures import Headers
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.codes import ErrorCode
from app.core.constants import CSRF_HEADER, DOCS_PATHS, SAFE_HTTP_METHODS
from app.core.exceptions import PayloadTooLargeError, error_response
from app.core.security.tokens import tokens_match

# La API solo responde JSON: no hay nada que cargar, incrustar ni ejecutar.
API_CONTENT_SECURITY_POLICY = (
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
)
# Swagger UI y ReDoc (solo fuera de producción) cargan sus archivos del CDN de FastAPI.
DOCS_CONTENT_SECURITY_POLICY = (
    "default-src 'none'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.redoc.ly; "
    "connect-src 'self'; worker-src blob:; "
    "frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
)
PERMISSIONS_POLICY = (
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), "
    "microphone=(), payment=(), usb=()"
)
HSTS_VALUE = "max-age=31536000; includeSubDomains"
CSRF_INVALID_MESSAGE = (
    "La sesión de seguridad del formulario expiró. Recarga la página e intenta de nuevo."
)

_STATIC_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": PERMISSIONS_POLICY,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    # Datos de nómina y de sesión: ningún navegador ni proxy intermedio debe guardarlos.
    "Cache-Control": "no-store",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, *, enable_hsts: bool) -> None:
        super().__init__(app)
        self._enable_hsts = enable_hsts

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        for name, value in _STATIC_SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        is_docs = request.url.path.startswith(DOCS_PATHS)
        response.headers["Content-Security-Policy"] = (
            DOCS_CONTENT_SECURITY_POLICY if is_docs else API_CONTENT_SECURITY_POLICY
        )
        if self._enable_hsts:
            response.headers["Strict-Transport-Security"] = HSTS_VALUE
        return response


class BodySizeLimitMiddleware:
    """Rechaza cuerpos mayores a ``max_bytes`` (413) sin leerlos completos.

    Revisa ``Content-Length`` antes de empezar y, para cuerpos sin esa cabecera (chunked),
    cuenta los bytes conforme llegan.
    """

    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        self._app = app
        self._max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return
        declared = Headers(scope=scope).get("content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > self._max_bytes):
            response = error_response(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                ErrorCode.PAYLOAD_TOO_LARGE,
                PayloadTooLargeError.default_message,
                {"max_bytes": self._max_bytes},
            )
            await response(scope, receive, send)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self._max_bytes:
                    raise PayloadTooLargeError(details={"max_bytes": self._max_bytes})
            return message

        await self._app(scope, limited_receive, send)


class CsrfMiddleware(BaseHTTPMiddleware):
    """Patrón *double-submit*: en todo método que modifica datos, el encabezado
    ``X-CSRF-Token`` debe ser igual a la cookie CSRF (comparación en tiempo constante).

    Otro sitio puede hacer que el navegador envíe la cookie, pero no puede leerla para
    copiarla en el encabezado. Como defensa adicional, si la petición trae ``Origin``, debe
    ser uno de los orígenes permitidos. Aplica a todas las rutas, incluidos el inicio de
    sesión y el registro (evita el *login CSRF*).
    """

    def __init__(self, app: ASGIApp, *, cookie_name: str, allowed_origins: Iterable[str]) -> None:
        super().__init__(app)
        self._cookie_name = cookie_name
        self._allowed_origins = frozenset(allowed_origins)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method in SAFE_HTTP_METHODS:
            return await call_next(request)
        origin = request.headers.get("origin")
        if origin is not None and origin not in self._allowed_origins:
            return error_response(
                HTTPStatus.FORBIDDEN,
                ErrorCode.CSRF_ORIGIN_NOT_ALLOWED,
                "La solicitud viene de un sitio no autorizado.",
            )
        cookie = request.cookies.get(self._cookie_name)
        header = request.headers.get(CSRF_HEADER)
        if not cookie or not header or not tokens_match(cookie, header):
            return error_response(
                HTTPStatus.FORBIDDEN,
                ErrorCode.CSRF_TOKEN_INVALID,
                CSRF_INVALID_MESSAGE,
            )
        return await call_next(request)
