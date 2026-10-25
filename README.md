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

> **Estado:** en desarrollo. Etapa 4 concluida (lógica de negocio: materias, asignaciones, horarios, bitácora y cálculo y emisión del recibo, con su API y la capa de datos del frontend). Las pantallas llegan en las etapas 6 a 8. Consulta la [hoja de ruta](#hoja-de-ruta).

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
- **Recibo de nómina quincenal** calculado automáticamente, con vista previa en vivo, advertencias (clases sin registrar, sesiones fuera de horario), desglose por materia y carrera, folio consecutivo y exportación a PDF (etapa 8).
- **Historial que no cambia en silencio:** cada sesión guarda la tarifa con la que se registró y el recibo emitido es una copia fija que bloquea la bitácora de su quincena.
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
├── docs/           Documentación técnica (arquitectura, base de datos, seguridad y diagramas)
├── scripts/        Utilidades para el entorno de desarrollo
├── CLAUDE.md       Reglas de negocio, convenciones y bitácora técnica del proyecto
├── README.md
└── LICENSE
```

| Documento | Contenido |
| --- | --- |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Componentes, capas y flujo de datos |
| [`docs/reglas-de-negocio.md`](docs/reglas-de-negocio.md) | Cada regla RN-XX, dónde se valida y su prueba; fórmula del cálculo con un ejemplo; diagramas de la emisión y del ciclo de vida de una sesión |
| [`docs/api.md`](docs/api.md) | Convenciones, tabla de endpoints y catálogo de códigos de error |
| [`docs/base-de-datos.md`](docs/base-de-datos.md) | Diagrama entidad-relación, diccionario de datos y decisiones de diseño |
| [`docs/seguridad.md`](docs/seguridad.md) | Flujos de autenticación, amenazas y mitigaciones |

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

### Probar el registro y el inicio de sesión

1. Con `bash scripts/dev.sh` en marcha, abre http://localhost:3000/panel: como no hay sesión, te lleva a **Iniciar sesión**.
2. Entra a **Regístrate** (http://localhost:3000/registro), captura tus datos y una contraseña que cumpla los requisitos que se muestran (al menos 12 caracteres, una letra y un número, sin tu nombre ni tu correo). Al crear la cuenta llegas al **panel**, que muestra tu nombre.
3. Pulsa **Cerrar sesión**: vuelves a Iniciar sesión y `/panel` deja de estar disponible.
4. Inicia sesión con tu correo y contraseña. Con una contraseña incorrecta verás «Correo o contraseña incorrectos»; tras 5 intentos fallidos seguidos la cuenta se bloquea 15 minutos.

En las herramientas del navegador (Aplicación → Cookies) verás `nomina_access`, `nomina_refresh` (ruta `/api/v1/auth`) y `nomina_session` como `HttpOnly`, y `nomina_csrf` legible. La API documentada está en http://127.0.0.1:8000/docs (sección *autenticación*).

Para levantar cada app por separado: `uv run python -m app` dentro de `backend/` y `npm run dev` dentro de `frontend/`.

### Datos de demostración

Para presentar el sistema sin capturar nada, carga una cuenta de demostración con datos **ficticios**:

```bash
bash scripts/demo-data.sh
```

Crea (o completa, si ya existe) a «Docente Demostración Ficticia» con 6 materias, 7 asignaciones en 4 carreras (ISC, IIND, LADM, IMEC) con las 3 tarifas, su horario semanal, la bitácora de las tres quincenas anteriores y de la actual, un cambio de tarifa a mitad del historial y los recibos emitidos de las dos quincenas más antiguas. La quincena anterior queda **terminada sin recibo**, lista para mostrar la emisión. Al final imprime las credenciales:

| Dato | Valor |
| --- | --- |
| Correo | `docente.demo@example.com` |
| Contraseña | `Pizarron-Verde-2026` |

- Todo pasa por los servicios del sistema, con las mismas validaciones que una captura real (no escribe directo en las tablas).
- Es idempotente: ejecutarlo otra vez solo agrega lo que falte.
- Se niega a correr si `APP_ENV` no es `development`. Requiere las migraciones y los datos semilla.

### Probar la API en `/docs`

1. Levanta el backend (`bash scripts/dev.sh` o `uv run python -m app` en `backend/`) y abre http://127.0.0.1:8000/docs.
2. Pide el token CSRF: **autenticación → `GET /api/v1/auth/csrf`** → *Try it out* → *Execute*. La cookie queda en el navegador; copia el valor de `csrf_token`.
3. Inicia sesión con **`POST /api/v1/auth/login`** y el cuerpo `{"email": "docente.demo@example.com", "password": "Pizarron-Verde-2026"}`. En las rutas que modifican datos, agrega el encabezado `X-CSRF-Token` con el valor del paso 2 (Swagger no lo agrega solo: para las escrituras es más cómodo `curl` o el frontend).
4. Con la sesión iniciada, las consultas funcionan directamente desde `/docs`:
   - **panel → `GET /dashboard/summary`**: horas y monto estimado de la quincena actual, clases de hoy y últimos recibos;
   - **nómina → `GET /payroll/periods?year=2026`**: las 24 quincenas con su estado (`issued`, `closed`, `open`, `future`);
   - **nómina → `GET /payroll/preview`** con la quincena que aparece como `closed`: renglones, totales y advertencias;
   - **horarios → `GET /schedules/weekly`** y **bitácora → `GET /logbook`** (con filtros y totales).

El catálogo de endpoints y de códigos de error está en [`docs/api.md`](docs/api.md).

### 5. Pruebas y calidad

```bash
# Backend (dentro de backend/)
uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest

# Frontend (dentro de frontend/)
npm run check && npm run api:check && npm run build
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
| [`scripts/demo-data.sh`](scripts/demo-data.sh) | Carga la cuenta de demostración con datos ficticios (solo desarrollo) |
| [`scripts/generate-api-types.sh`](scripts/generate-api-types.sh) | Regenera los tipos de TypeScript desde el OpenAPI (`--check` verifica que estén al día) |

Más detalles en [`scripts/README.md`](scripts/README.md).

## Hoja de ruta

- [x] 0. Cimientos y documentación
- [x] 1. Arquitectura base del backend y frontend
- [x] 2. Base de datos: modelos, migraciones y catálogo de carreras
- [x] 3. Autenticación: registro, inicio de sesión, sesión y seguridad
- [x] 4. Lógica de negocio: materias, asignaciones, horarios, bitácora y cálculo de nómina
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
