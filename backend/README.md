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
| `src/app/core/` | Configuración (`config.py`), constantes, logging JSON, middleware de peticiones y excepciones de dominio |
| `src/app/db/` | Motor, sesiones (`get_db`) y base declarativa con convención de nombres |
| `src/app/models/` | Modelos ORM (uno por archivo; se registran en `models/__init__.py` para Alembic) |
| `src/app/schemas/` | Contratos Pydantic de entrada y salida |
| `src/app/repositories/` | Acceso a datos, sin reglas de negocio |
| `src/app/services/` | Lógica de negocio, sin HTTP |
| `src/app/api/v1/routers/` | Endpoints delgados |
| `src/app/api/v1/dependencies.py` | Composición: arma servicios con sus repositorios para los routers |
| `src/app/seeds/` | Datos semilla (a partir de la etapa 2) |
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
| `uv run alembic upgrade head` | Aplica migraciones (a partir de la etapa 2) |
| `uv run alembic revision --autogenerate -m "…"` | Genera una migración a partir de los modelos |

Las pruebas marcadas con `@pytest.mark.db` usan `DB_NAME_TEST`. Si la base no está disponible, se **saltan** con un mensaje que indica qué revisar.

## Endpoints

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/v1/health` | Estado de la API y de la base de datos (`status`: `ok` o `degraded`) |
| `GET /docs` | Documentación interactiva (OpenAPI en `/api/v1/openapi.json`) |
