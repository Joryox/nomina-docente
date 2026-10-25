# Backend — API del Sistema de Nómina Docente

API REST construida con **FastAPI**, **SQLAlchemy 2.0** y **PostgreSQL**, organizada en una arquitectura limpia por capas:

```
routers (API) → services (negocio) → repositories (datos) → models (ORM)
```

> **Estado:** el proyecto se inicializa en la etapa 1. Por ahora esta carpeta solo contiene la configuración de ejemplo.

## Contenido previsto

| Ruta | Propósito |
| --- | --- |
| `src/app/` | Código de la aplicación (ver capas en [`../docs/arquitectura.md`](../docs/arquitectura.md)) |
| `alembic/` | Migraciones de base de datos |
| `tests/unit/`, `tests/integration/` | Pruebas, espejo de `src/app/` |
| `pyproject.toml` | Dependencias y configuración de herramientas (uv, Ruff, mypy, pytest) |
| `.env.example` | Variables de entorno documentadas |

## Configuración

Copia `.env.example` a `.env` y ajusta los valores. El backend no inicia si falta alguna variable obligatoria.

Las instrucciones de instalación y ejecución se agregarán en la etapa 1.
