# Backend — API del Sistema de Nómina Docente

API REST construida con **FastAPI**, **SQLAlchemy 2.0** (síncrono, psycopg 3) y **PostgreSQL**, organizada en una arquitectura limpia por capas:

```
routers (API) → services (negocio) → repositories (datos) → models (ORM)
```

## Estructura

| Ruta | Propósito |
| --- | --- |
| `src/app/main.py` | `create_app()`: registra middlewares, CORS, manejadores de errores y routers |
| `src/app/__main__.py` | Arranque del servidor con host y puerto de la configuración (`python -m app`) |
| `src/app/core/` | Configuración (`config.py`), constantes, reloj inyectable, logging JSON, middleware de peticiones y excepciones de dominio |
| `src/app/core/security/` | Argon2, JWT y tokens opacos, política de contraseñas (con `data/common-passwords.txt`), middlewares de cabeceras, tamaño y CSRF, y auditoría |
| `src/app/db/` | Motor, sesiones (`get_db`), base declarativa con convención de nombres, mezclas de columnas comunes (`mixins.py`) y expresiones `CHECK` reutilizables (`checks.py`) |
| `src/app/models/` | Modelos ORM (uno por archivo; se registran en `models/__init__.py` para Alembic) |
| `src/app/schemas/` | Contratos Pydantic de entrada y salida |
| `src/app/repositories/` | Acceso a datos, sin reglas de negocio |
| `src/app/domain/` | Reglas puras sin E/S: periodos quincenales, redondeo (único módulo que redondea), cálculo del recibo, intervalos de clase y ocurrencias del horario |
| `src/app/services/` | Lógica de negocio, sin HTTP: materias, asignaciones, horarios, bitácora, nómina, panel y catálogos; `constraints.py` traduce restricciones de la base a códigos de dominio |
| `src/app/api/v1/routers/` | Endpoints delgados |
| `src/app/api/v1/dependencies.py` | Composición: arma servicios con sus repositorios; `get_current_user`, `get_current_teacher` y `require_roles` |
| `src/app/api/v1/cookies.py` | Cookies de sesión y CSRF |
| `src/app/seeds/` | Datos semilla: archivos en `data/*.json`, validación (`schemas.py`, `loader.py`) y carga idempotente (`runner.py`, `python -m app.seeds`) |
| `src/app/demo/` | Cuenta de demostración con datos ficticios, cargada por los servicios (`python -m app.demo`, solo desarrollo) |
| `src/app/api/export_openapi.py` | Exporta el esquema OpenAPI sin levantar el servidor (para generar los tipos del frontend) |
| `src/app/utils/` | Utilidades sin estado (formato del folio) |
| `alembic/` | Migraciones; la URL sale de `Settings`, nunca de `alembic.ini` |
| `tests/unit/`, `tests/integration/` | Pruebas, espejo de `src/app/` |

## Configuración

`scripts/setup.sh` crea `.env` a partir de `.env.example` con un `JWT_SECRET` aleatorio. Todas las variables son obligatorias. Si falta una o no es válida, el backend no inicia y el mensaje nombra la variable.

## Comandos

Todos se ejecutan dentro de `backend/`:

| Comando | Qué hace |
| --- | --- |
| `uv sync` | Instala dependencias (incluye las de desarrollo) |
| `uv run python -m app` | Levanta la API en `http://API_HOST:API_PORT` (recarga automática en desarrollo) |
| `uv run ruff check .` | Lint |
| `uv run ruff format .` | Formato (`--check` para solo verificar) |
| `uv run mypy` | Tipos en modo estricto |
| `uv run pytest` | Pruebas (`--cov` para cobertura; `-m "not db"` para omitir las que usan base de datos) |
| `uv run alembic upgrade head` | Aplica migraciones (`bash scripts/migrate.sh` desde la raíz) |
| `uv run python -m app.seeds` | Carga los datos semilla (`bash scripts/seed.sh` desde la raíz) |
| `uv run python -m app.demo` | Carga la cuenta de demostración (`bash scripts/demo-data.sh` desde la raíz; solo `APP_ENV=development`) |
| `uv run python -m app.api.export_openapi RUTA` | Escribe el esquema OpenAPI en `RUTA` |
| `uv run alembic revision --autogenerate -m "…"` | Genera una migración a partir de los modelos |

Las pruebas marcadas con `@pytest.mark.db` usan `DB_NAME_TEST`: la migran a la última versión al iniciar y corren cada prueba dentro de una transacción que se revierte al terminar. Si la base no está disponible, se **saltan** con un mensaje que indica qué revisar.

El esquema de base de datos está documentado en [`docs/base-de-datos.md`](../docs/base-de-datos.md).

## Endpoints

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/v1/health` | Estado de la API y de la base de datos (`status`: `ok` o `degraded`) |
| `GET /api/v1/auth/csrf` | Token CSRF (cookie legible + valor para el encabezado `X-CSRF-Token`) |
| `GET /api/v1/auth/password-policy` | Requisitos de contraseña que aplica el servidor |
| `POST /api/v1/auth/register` | Registro de docente (cuenta, perfil, rol y sesión en una transacción) |
| `POST /api/v1/auth/login` | Inicio de sesión (mensaje genérico, bloqueo tras intentos fallidos) |
| `POST /api/v1/auth/refresh` | Rotación del refresh token y nuevo token de acceso |
| `POST /api/v1/auth/logout` y `/logout-all` | Cierra la sesión actual o todas |
| `GET` y `PATCH /api/v1/auth/me` | Datos de la cuenta y del perfil; actualización del perfil |
| `POST /api/v1/auth/change-password` | Cambio de contraseña (revoca las demás sesiones) |

| `GET /docs` | Documentación interactiva (OpenAPI en `/api/v1/openapi.json`) |

Lógica de negocio (etapa 4), todas con sesión de docente: catálogos (`/catalogs/*`), materias (`/subjects`), asignaciones y sus horarios (`/assignments`), horario semanal (`/schedules`), bitácora (`/logbook`, `/logbook/scheduled`, `/logbook/quick`), nómina (`/payroll/periods`, `/payroll/preview`, `/payroll/receipts`) y panel (`/dashboard/summary`). La tabla completa, las convenciones (dinero como cadena, paginación, filtros) y el catálogo de códigos de error están en [`docs/api.md`](../docs/api.md).

Toda petición que modifica datos requiere el encabezado `X-CSRF-Token`. Detalle en [`docs/seguridad.md`](../docs/seguridad.md).
