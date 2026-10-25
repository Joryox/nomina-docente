# Sistema de Nómina Docente

Sistema web para que el personal docente del **TESH** (Tecnológico de Estudios Superiores) registre sus asignaciones, horarios y sesiones impartidas, y obtenga su **recibo de nómina quincenal** calculado automáticamente.

![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=sqlalchemy&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-informational)

> **Estado:** en desarrollo. Etapa actual: 0 — Cimientos y documentación. Consulta la [hoja de ruta](#hoja-de-ruta).

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
| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, psycopg 3, uv |
| Seguridad | JWT en cookie `httpOnly`, contraseñas con Argon2id, protección CSRF |
| Frontend | Next.js (App Router), TypeScript estricto, Tailwind CSS, shadcn/ui, Framer Motion, React Hook Form, Zod, TanStack Query |
| Base de datos | PostgreSQL |
| Calidad | Ruff, mypy, pytest, ESLint, Prettier |

## Estructura del proyecto

```
nomina-docente/
├── backend/        API REST en FastAPI (arquitectura limpia por capas)
├── frontend/       Aplicación web en Next.js (organizada por funcionalidades)
│   └── public/brand/   Logos institucionales
├── docs/           Documentación técnica (arquitectura y diagramas)
├── scripts/        Utilidades para el entorno de desarrollo
├── CLAUDE.md       Reglas de negocio, convenciones y bitácora técnica del proyecto
├── README.md
└── LICENSE
```

La arquitectura se explica en [`docs/arquitectura.md`](docs/arquitectura.md).

## Requisitos

| Herramienta | Versión mínima |
| --- | --- |
| git | 2.40 |
| Python | 3.12 |
| [uv](https://docs.astral.sh/uv/) | 0.5 |
| Node.js | 20.9 (se recomienda la versión LTS vigente) |
| npm | 10 |
| PostgreSQL | 16 |

## Instalación

> Las instrucciones se completarán conforme avancen las etapas del proyecto.

### 1. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/nomina-docente.git
cd nomina-docente
```

### 2. Base de datos

<!-- Etapa 1-2: script de scripts/ para crear nomina_docente y nomina_docente_test. -->
_Pendiente (etapas 1 y 2)._

### 3. Backend

<!-- Etapa 1: copiar backend/.env.example a backend/.env, uv sync, migraciones, semillas y arranque. -->
_Pendiente (etapa 1)._

### 4. Frontend

<!-- Etapa 1: copiar frontend/.env.example a frontend/.env.local, npm install y arranque. -->
_Pendiente (etapa 1)._

### 5. Pruebas y calidad

<!-- Etapa 1 en adelante: comandos de pytest, ruff, mypy, eslint y prettier. -->
_Pendiente (etapa 1)._

## Scripts de desarrollo

Los scripts de apoyo viven en [`scripts/`](scripts/) y se documentarán aquí conforme se agreguen.

## Hoja de ruta

- [x] 0. Cimientos y documentación
- [ ] 1. Arquitectura base del backend y frontend
- [ ] 2. Base de datos: modelos, migraciones y catálogo de carreras
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
| Institución | _[Nombre oficial de la institución]_ — TESH |

## Licencia

Distribuido bajo la licencia MIT. Consulta [`LICENSE`](LICENSE).
