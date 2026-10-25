# Sistema de Nómina Docente

Sistema web para que el personal docente del **Tecnológico de Estudios Superiores de Huixquilucan (TESH)** registre sus asignaciones, horarios y sesiones impartidas, y obtenga su **recibo de nómina quincenal** calculado automáticamente.

![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=sqlalchemy&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-informational)

> **Estado:** en desarrollo. Etapa 2 concluida (base de datos: modelos, migraciones, restricciones y catálogos semilla). Consulta la [hoja de ruta](#hoja-de-ruta).

---

## Descripción

Cada docente lleva el control de las clases que imparte en una o varias carreras. A partir de las sesiones registradas en su bitácora, el sistema calcula las horas trabajadas por materia y carrera, aplica la tarifa por hora correspondiente y genera un recibo de nómina con folio, listo para descargarse en PDF.

El diseño parte de un principio: **el sistema debe impedir errores**. Por eso usa selectores en lugar de texto libre, valida en el navegador, en el servidor y en la base de datos, y calcula todos los montos de forma automática.

## Características

- **Cuenta personal por docente.** Registro e inicio de sesión; cada docente solo ve y administra su propia información.
- **Catálogo de carreras.** Las carreras se eligen de un menú alimentado por la base de datos.
- **Asignaciones.** Combinación de materia, carrera y tarifa por hora, con tarifas tomadas de un catálogo.
- **Horarios semanales** con validación de horas y detección de empalmes.
- **Bitácora de sesiones** precargada con el horario del día, ajustable por el docente.
- **Recibo de nómina quincenal** calculado automáticamente, con desglose por materia y carrera, folio consecutivo y exportación a PDF.
- **Precisión monetaria:** todos los cálculos con aritmética decimal exacta, en pesos mexicanos (MXN).
- **Interfaz en español de México**, accesible (WCAG 2.2 AA) y responsiva.

## Stack técnico

| Capa | Tecnologías |
| --- | --- |
| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, psycopg 3, uv |
| Seguridad | JWT en cookie `httpOnly`, contraseñas con Argon2id, protección CSRF |
| Frontend | Next.js 16 (App Router), TypeScript estricto, Tailwind CSS 4, shadcn/ui, Framer Motion, React Hook Form, Zod, TanStack Query |
| Base de datos | PostgreSQL |
| Calidad | Ruff, mypy, pytest, ESLint, Prettier |

## Estructura del proyecto

```
nomina-docente/
├── backend/        API REST en FastAPI (arquitectura limpia por capas)
├── frontend/       Aplicación web en Next.js (organizada por funcionalidades)
│   └── public/brand/   Logos institucionales
├── docs/           Documentación técnica (arquitectura, base de datos y diagramas)
├── scripts/        Utilidades para el entorno de desarrollo
├── CLAUDE.md       Reglas de negocio, convenciones y bitácora técnica del proyecto
├── README.md
└── LICENSE
```

La arquitectura se explica en [`docs/arquitectura.md`](docs/arquitectura.md) y el esquema de base de datos (diagrama entidad-relación, diccionario de datos y decisiones de diseño) en [`docs/base-de-datos.md`](docs/base-de-datos.md).

## Requisitos

El entorno principal de desarrollo es **Windows 11 con Git Bash**. Todo funciona igual en **Linux** con Bash.

| Herramienta | Versión | Notas |
| --- | --- | --- |
| git | 2.40 o superior | En Windows incluye Git Bash |
| Python | 3.12 o superior | uv puede instalarlo si no existe |
| [uv](https://docs.astral.sh/uv/) | 0.5 o superior | Dependencias y entorno virtual del backend |
| Node.js | 24 LTS (ver `frontend/.nvmrc`) | Incluye npm 10 o superior |
| PostgreSQL | 16 o superior (se usa 18) | Servidor local y cliente `psql` |

### Instalar las herramientas

**Windows 11** (PowerShell, instalación de usuario):

```powershell
# uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Node.js LTS
winget install --id OpenJS.NodeJS.LTS --exact

# Agregar psql al PATH del usuario (ajusta la versión de PostgreSQL si es otra)
$pg = 'C:\Program Files\PostgreSQL\18\bin'
$path = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($path -split ';') -notcontains $pg) { [Environment]::SetEnvironmentVariable('Path', "$path;$pg", 'User') }
```

Después, cierra y vuelve a abrir Git Bash para que tome el nuevo `PATH`. PostgreSQL se instala con el instalador oficial de EDB.

**Linux** (Debian/Ubuntu como referencia):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
sudo apt install postgresql postgresql-client
# Node.js 24 LTS con nvm (lee frontend/.nvmrc)
nvm install 24
```

## Instalación

Todos los comandos se ejecutan en **Git Bash** (Windows) o en una terminal Bash (Linux), desde la raíz del repositorio.

### 1. Clonar el repositorio

```bash
git clone https://github.com/Joryox/nomina-docente.git
cd nomina-docente
```

En Windows, configura los finales de línea del repositorio local (el proyecto usa LF):

```bash
git config core.autocrlf false
git config core.eol lf
```

### 2. Preparar el entorno

```bash
bash scripts/setup.sh
```

Crea `backend/.env` (con un `JWT_SECRET` aleatorio) y `frontend/.env.local` si no existen, e instala las dependencias de ambas apps.

### 3. Configurar y crear las bases de datos

1. Abre `backend/.env` y escribe en `DB_PASSWORD` la contraseña del usuario de PostgreSQL (`DB_USER`, por defecto `postgres`).
2. Crea las bases `nomina_docente` y `nomina_docente_test`:

   ```bash
   bash scripts/create-databases.sh
   ```

3. Crea las tablas (y las extensiones `btree_gist` y `unaccent`) en la base de desarrollo y carga los catálogos (carreras del TESH, tarifas y roles):

   ```bash
   bash scripts/migrate.sh
   bash scripts/seed.sh
   ```

Los tres scripts son idempotentes: ejecutarlos de nuevo no duplica ni rompe nada. Las pruebas migran por su cuenta la base de pruebas.

### 4. Levantar el proyecto

```bash
bash scripts/dev.sh
```

| Servicio | URL |
| --- | --- |
| Aplicación web | http://localhost:3000 |
| API a través del frontend | http://localhost:3000/api/v1/health |
| API directa y documentación | http://127.0.0.1:8000/docs |

La página inicial muestra el estado de la API y de la base de datos. `Ctrl+C` detiene ambos servidores.

Para levantar cada app por separado: `uv run python -m app` dentro de `backend/` y `npm run dev` dentro de `frontend/`.

### 5. Pruebas y calidad

```bash
# Backend (dentro de backend/)
uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest

# Frontend (dentro de frontend/)
npm run check && npm run build
```

Las pruebas que necesitan la base de datos se saltan, con un aviso que explica cómo prepararla, si `nomina_docente_test` no está disponible.

## Scripts de desarrollo

| Script | Descripción |
| --- | --- |
| [`scripts/setup.sh`](scripts/setup.sh) | Crea los archivos `.env` que falten e instala dependencias |
| [`scripts/create-databases.sh`](scripts/create-databases.sh) | Crea las bases de desarrollo y de pruebas |
| [`scripts/migrate.sh`](scripts/migrate.sh) | Aplica las migraciones de Alembic (acepta argumentos, p. ej. `downgrade base`) |
| [`scripts/seed.sh`](scripts/seed.sh) | Carga los datos semilla: carreras, tipos de carrera, tarifas y roles |
| [`scripts/dev.sh`](scripts/dev.sh) | Levanta backend y frontend con un solo comando |

Más detalles en [`scripts/README.md`](scripts/README.md).

## Hoja de ruta

- [x] 0. Cimientos y documentación
- [x] 1. Arquitectura base del backend y frontend
- [x] 2. Base de datos: modelos, migraciones y catálogo de carreras
- [ ] 3. Autenticación: registro, inicio de sesión, sesión y seguridad
- [ ] 4. Lógica de negocio: materias, asignaciones, horarios, bitácora y cálculo de nómina
- [ ] 5. Sistema de diseño
- [ ] 6. Pantallas: inicio de sesión, registro y panel principal
- [ ] 7. Pantallas: asignaciones, horarios y bitácora
- [ ] 8. Recibo de nómina y exportación a PDF
- [ ] 9. Animaciones y microinteracciones
- [ ] 10. Pruebas, QA y revisión de seguridad
- [ ] 11. Logos, pulido final y documentación

**Fuera del alcance de esta versión:** cálculo de ISR e IMSS, rol de administrador y despliegue en servidor.

## Créditos

| Rol | Nombre |
| --- | --- |
| Desarrollo | _[Tu nombre]_ |
| Profesor asesor | _[Nombre del profesor asesor]_ |
| Institución | Tecnológico de Estudios Superiores de Huixquilucan (TESH) |

## Licencia

Distribuido bajo la licencia MIT. Consulta [`LICENSE`](LICENSE).
