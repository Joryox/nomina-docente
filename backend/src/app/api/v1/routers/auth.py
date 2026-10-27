from http import HTTPStatus

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from app.api.v1.cookies import clear_session_cookies, issue_csrf_cookie, set_session_cookies
from app.api.v1.dependencies import (
    AccountServiceDep,
    AppSettings,
    AuthServiceDep,
    Client,
    CurrentUser,
)
from app.api.v1.openapi import error_responses
from app.core.constants import AUTH_ROUTE_PREFIX
from app.core.exceptions import AuthenticationError, error_response
from app.schemas.auth import (
    ChangePasswordRequest,
    CsrfTokenResponse,
    LoginRequest,
    MeResponse,
    PasswordPolicyResponse,
    RegisterRequest,
    UpdateProfileRequest,
)

router = APIRouter(prefix=AUTH_ROUTE_PREFIX, tags=["autenticación"])

CSRF_NOTE = (
    "Requiere el encabezado `X-CSRF-Token` con el valor de la cookie CSRF "
    "(obtenla con `GET /auth/csrf`)."
)


@router.get(
    "/csrf",
    summary="Obtener el token CSRF",
    description=(
        "Entrega el token CSRF y lo deja en una cookie legible por el frontend. Si la cookie "
        "ya existe, devuelve el mismo valor. Toda petición que modifica datos debe enviarlo en "
        "el encabezado `X-CSRF-Token` (patrón *double-submit*)."
    ),
)
def get_csrf_token(
    request: Request, response: Response, settings: AppSettings
) -> CsrfTokenResponse:
    existing = request.cookies.get(settings.csrf_cookie_name)
    return CsrfTokenResponse(csrf_token=existing or issue_csrf_cookie(response, settings))


@router.get(
    "/password-policy",
    summary="Consultar la política de contraseñas",
    description=(
        "Requisitos que el servidor aplica a toda contraseña nueva. El frontend los usa para "
        "mostrar y validar los requisitos sin duplicarlos. La lista de contraseñas comunes no "
        "se publica: solo el servidor la consulta."
    ),
)
def get_password_policy(service: AuthServiceDep) -> PasswordPolicyResponse:
    return service.password_policy()


@router.post(
    "/register",
    status_code=HTTPStatus.CREATED,
    summary="Registrar una cuenta de docente",
    description=(
        "Crea en una sola transacción la cuenta, el perfil de docente y el rol `teacher`, e "
        "inicia sesión (deja las cookies de acceso, refresh, indicador y un token CSRF nuevo). "
        f"El correo se guarda en minúsculas y sin espacios. {CSRF_NOTE}"
    ),
    responses=error_responses(
        HTTPStatus.FORBIDDEN, HTTPStatus.CONFLICT, HTTPStatus.UNPROCESSABLE_ENTITY
    ),
)
def register(
    data: RegisterRequest,
    response: Response,
    service: AuthServiceDep,
    settings: AppSettings,
    client: Client,
) -> MeResponse:
    me, issued = service.register(data, client)
    set_session_cookies(response, settings, issued)
    issue_csrf_cookie(response, settings)
    return me


@router.post(
    "/login",
    summary="Iniciar sesión",
    description=(
        "Valida correo y contraseña. Ante cualquier fallo (correo inexistente, contraseña "
        "incorrecta o cuenta desactivada) responde el mismo error genérico "
        "`INVALID_CREDENTIALS` en un tiempo similar. Tras `LOGIN_MAX_FAILED_ATTEMPTS` intentos "
        "fallidos seguidos, la cuenta se bloquea `LOGIN_LOCKOUT_MINUTES` minutos; si durante "
        "el bloqueo llega la contraseña correcta, responde `ACCOUNT_LOCKED` con "
        f"`details.retry_after_seconds` (saberla ya prueba que la cuenta existe). {CSRF_NOTE}"
    ),
    responses=error_responses(
        HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN, HTTPStatus.UNPROCESSABLE_ENTITY
    ),
)
def login(
    data: LoginRequest,
    response: Response,
    service: AuthServiceDep,
    settings: AppSettings,
    client: Client,
) -> MeResponse:
    me, issued = service.login(data, client)
    set_session_cookies(response, settings, issued)
    issue_csrf_cookie(response, settings)
    return me


@router.post(
    "/refresh",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Renovar la sesión",
    description=(
        "Cambia el refresh token (cookie con ruta restringida a `/api/v1/auth`) por uno nuevo "
        "y emite un token de acceso nuevo (rotación). Si se presenta un refresh token ya usado, "
        "se revocan **todas** las sesiones del usuario (detección de reuso). Si otra pestaña "
        "acaba de renovar la sesión, responde 409 `SESSION_REFRESH_CONFLICT`: basta repetir "
        f"la petición original, porque las cookies nuevas ya están en el navegador. {CSRF_NOTE}"
    ),
    responses=error_responses(HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN, HTTPStatus.CONFLICT),
)
def refresh(request: Request, service: AuthServiceDep, settings: AppSettings) -> Response:
    raw_token = request.cookies.get(settings.refresh_cookie_name)
    try:
        if not raw_token:
            raise AuthenticationError()
        issued = service.refresh(raw_token)
    except AuthenticationError as error:
        # La sesión ya no sirve: se borran las cookies para que el proxy deje de considerarla.
        failure: JSONResponse = error_response(
            HTTPStatus.UNAUTHORIZED, error.code, error.message, error.details
        )
        clear_session_cookies(failure, settings)
        return failure
    response = Response(status_code=HTTPStatus.NO_CONTENT)
    set_session_cookies(response, settings, issued)
    return response


@router.post(
    "/logout",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Cerrar la sesión actual",
    description=(
        "Revoca la sesión de este dispositivo y borra sus cookies. Es idempotente: responde "
        f"204 aunque la sesión ya no exista. {CSRF_NOTE}"
    ),
    responses=error_responses(HTTPStatus.FORBIDDEN),
)
def logout(request: Request, service: AuthServiceDep, settings: AppSettings) -> Response:
    service.logout(
        request.cookies.get(settings.refresh_cookie_name),
        request.cookies.get(settings.access_cookie_name),
    )
    response = Response(status_code=HTTPStatus.NO_CONTENT)
    clear_session_cookies(response, settings)
    issue_csrf_cookie(response, settings)
    return response


@router.post(
    "/logout-all",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Cerrar todas las sesiones",
    description=(
        "Revoca todas las sesiones de la cuenta, en todos los dispositivos, incluida la actual. "
        f"{CSRF_NOTE}"
    ),
    responses=error_responses(HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN),
)
def logout_all(principal: CurrentUser, service: AuthServiceDep, settings: AppSettings) -> Response:
    service.logout_all(principal)
    response = Response(status_code=HTTPStatus.NO_CONTENT)
    clear_session_cookies(response, settings)
    issue_csrf_cookie(response, settings)
    return response


@router.get(
    "/me",
    summary="Consultar mi cuenta",
    description="Datos de la cuenta autenticada y de su perfil de docente.",
    responses=error_responses(HTTPStatus.UNAUTHORIZED),
)
def get_me(principal: CurrentUser, service: AccountServiceDep) -> MeResponse:
    return service.get_me(principal)


@router.patch(
    "/me",
    summary="Actualizar mi perfil",
    description=(
        "Actualiza nombre(s), apellidos y número de empleado. Solo cambia los campos enviados; "
        "`null` o texto vacío borra el apellido materno o el número de empleado. El correo no "
        f"se puede cambiar. {CSRF_NOTE}"
    ),
    responses=error_responses(
        HTTPStatus.UNAUTHORIZED,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.CONFLICT,
        HTTPStatus.UNPROCESSABLE_ENTITY,
    ),
)
def update_me(
    data: UpdateProfileRequest, principal: CurrentUser, service: AccountServiceDep
) -> MeResponse:
    return service.update_profile(principal, data)


@router.post(
    "/change-password",
    status_code=HTTPStatus.NO_CONTENT,
    summary="Cambiar mi contraseña",
    description=(
        "Exige la contraseña actual, aplica la política de contraseñas y revoca las demás "
        "sesiones de la cuenta (la actual sigue activa). Un error en la contraseña actual "
        f"cuenta como intento fallido para el bloqueo. {CSRF_NOTE}"
    ),
    responses=error_responses(
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.UNAUTHORIZED,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.UNPROCESSABLE_ENTITY,
    ),
)
def change_password(
    data: ChangePasswordRequest, principal: CurrentUser, service: AccountServiceDep
) -> Response:
    service.change_password(principal, data)
    return Response(status_code=HTTPStatus.NO_CONTENT)
