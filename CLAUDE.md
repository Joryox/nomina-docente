# CLAUDE.md — Memoria permanente del proyecto

> Este archivo es la fuente de verdad del proyecto **Sistema de Nómina Docente** (`nomina-docente`).
> Cada sesión de trabajo empieza leyéndolo completo y termina actualizándolo.
> Si algo de este documento contradice al código, se corrige uno de los dos en la misma etapa: nunca se dejan desalineados.

---

## Índice

1. [Contexto del proyecto](#1-contexto-del-proyecto)
2. [Reglas de negocio](#2-reglas-de-negocio)
3. [Stack técnico](#3-stack-técnico)
4. [Arquitectura limpia y cero valores hardcodeados](#4-arquitectura-limpia-y-cero-valores-hardcodeados)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Seguridad](#6-seguridad)
7. [Reglas de diseño](#7-reglas-de-diseño)
8. [Convenciones del equipo](#8-convenciones-del-equipo)
9. [Entorno de desarrollo](#9-entorno-de-desarrollo)
10. [Hoja de ruta](#10-hoja-de-ruta)
11. [Decisiones pendientes](#11-decisiones-pendientes)
12. [Registro de avances](#12-registro-de-avances)

---

## 1. Contexto del proyecto

| Concepto | Valor |
| --- | --- |
| Nombre | Sistema de Nómina Docente |
| Repositorio | `nomina-docente` (público en GitHub, evidencia de trabajo revisada por un profesor investigador) |
| Institución | **Tecnológico de Estudios Superiores de Huixquilucan (TESH)** — nombre oficial confirmado por el responsable (2026-10-25). Logos oficiales pendientes; van en `frontend/public/brand/` |
| Usuarios | Exclusivamente **docentes**. Cada docente se registra, inicia sesión y solo ve y administra **su propia** información |
| Roles | Sin administrador en esta versión. El modelo de datos ya incluye roles para agregarlos después sin rehacer tablas |
| Idioma de la interfaz | Español de México (`es-MX`) |
| Zona horaria | `America/Mexico_City` |
| Moneda | MXN |
| Ejecución | Local. No hay despliegue a la nube por ahora |
| Base de datos | PostgreSQL local (administrada con DBeaver). BD: `nomina_docente`. BD de pruebas: `nomina_docente_test` |

**Principio rector:** el sistema debe **impedir errores**, no solo reportarlos. Para lograrlo:

- Selectores en lugar de texto libre siempre que el dato ya exista.
- Validación en tres niveles: frontend (Zod), backend (Pydantic + servicios) y base de datos (constraints).
- Cálculos automáticos: el docente nunca escribe montos ni horas calculadas.
- Confirmación explícita antes de cualquier acción destructiva (borrar, emitir un recibo).

---

## 2. Reglas de negocio

Cada regla tiene un identificador (`RN-XX`) para citarla en código, pruebas y commits cuando aporte claridad.

### 2.1 Docentes

- **RN-01 Registro.** El docente se registra con: nombre(s), apellido paterno, apellido materno, correo electrónico, número de empleado (opcional) y contraseña.
- **RN-02 Correo único.** No pueden existir dos cuentas con el mismo correo. La comparación ignora mayúsculas/minúsculas y espacios al inicio o final (el correo se normaliza a minúsculas antes de guardarse).
- **RN-03 Número de empleado.** Es opcional; si se captura, es único entre docentes.
- **RN-04 Aislamiento de datos.** Un docente solo puede leer y modificar sus propios registros (materias, asignaciones, horarios, bitácora y recibos). Toda consulta de un recurso se filtra por el docente autenticado; si un recurso existe pero pertenece a otro docente, la API responde **404** (no 403) para no revelar su existencia.

### 2.2 Carreras

- **RN-05 Catálogo de carreras.** Las carreras son un catálogo administrado en base de datos, cada una con clave corta única, nombre oficial, tipo (catálogo `career_types`: ingeniería o licenciatura) y estado activo. El catálogo oficial del TESH (fuente: **volante oficial de admisión 2024 del TESH**) tiene 7 carreras: Ingeniería Civil (`ICIV`), Ingeniería Industrial (`IIND`), Ingeniería Mecatrónica (`IMEC`), Ingeniería en Sistemas Computacionales (`ISC`), Licenciatura en Administración (`LADM`), Licenciatura en Biología (`LBIO`) y Licenciatura en Gastronomía (`LGAS`). Se carga con datos semilla; agregar una carrera o un tipo nuevo (por ejemplo, Derecho o Bachillerato) es editar `backend/src/app/seeds/data/` y ejecutar `scripts/seed.sh`, sin tocar código.
- **RN-06 Selección, no captura.** El docente elige la carrera de un menú. Nunca la escribe a mano. Los docentes no pueden crear, editar ni borrar carreras.
- **RN-07 Baja lógica.** Una carrera se desactiva (`is_active = false`), no se borra, para no romper el historial. Las carreras inactivas no aparecen en los selectores pero se siguen mostrando en registros históricos.

### 2.3 Materias

- **RN-08 Materias del docente.** Un docente puede impartir **varias** materias en **varias** carreras. Cada docente registra las materias que imparte una sola vez (nombre y, opcionalmente, clave) y después las reutiliza desde selectores.
- **RN-09 Sin duplicados.** Un docente no puede registrar dos materias con el mismo nombre. La comparación ignora mayúsculas/minúsculas, acentos y espacios repetidos.

### 2.4 Tarifas por hora

- **RN-10 Catálogo de tarifas.** Las tarifas por hora viven en la tabla catálogo `hourly_rates`. Los valores iniciales son **$125.00, $135.00 y $145.00 MXN**, cargados con datos semilla. Agregar una tarifa nueva es insertar un registro: no requiere cambiar código.
- **RN-11 Selector de tarifas.** El docente elige la tarifa de un selector cuyas opciones vienen de la API. El backend rechaza cualquier tarifa que no exista o esté inactiva; la base de datos lo garantiza con una llave foránea.
- **RN-12 Tarifas inmutables.** El importe de una tarifa existente no se modifica. Si cambia el tabulador, se desactiva la tarifa anterior y se crea una nueva. Así ningún cálculo histórico cambia en silencio.

### 2.5 Asignaciones

- **RN-13 Definición.** Una asignación es la unión **docente + materia + carrera + tarifa por hora**.
- **RN-14 Unicidad.** Un docente no puede tener dos asignaciones **activas** con la misma materia en la misma carrera. Una asignación desactivada conserva su historial y permite crear otra (por ejemplo, con una tarifa distinta).
- **RN-15 Borrado protegido.** Una asignación con sesiones en bitácora no se puede borrar; solo se puede desactivar. Sin bitácora, se puede borrar previa confirmación (sus horarios se eliminan con ella).

### 2.6 Horarios

- **RN-16 Horario semanal.** Cada asignación tiene uno o más horarios semanales: día de la semana, hora de entrada y hora de salida.
- **RN-17 Salida posterior a la entrada.** La hora de salida debe ser estrictamente posterior a la hora de entrada. Un horario no cruza la medianoche.
- **RN-18 Sin empalmes.** Un docente no puede tener horarios empalmados entre sí, aunque pertenezcan a asignaciones distintas. Los intervalos son semiabiertos `[entrada, salida)`: un horario que termina a las 11:00 y otro que empieza a las 11:00 **no** se empalman.

### 2.7 Bitácora

- **RN-19 Sesiones impartidas.** La bitácora registra las sesiones realmente impartidas: fecha, asignación, hora de entrada, hora de salida y observaciones (opcionales).
- **RN-20 Captura por selección.** Al capturar, el docente elige de listas lo que ya existe (asignación, es decir, materia y carrera). No vuelve a escribir nada que ya esté registrado.
- **RN-21 Precarga desde el horario.** Al elegir fecha y asignación, se precargan la entrada y la salida del horario correspondiente a ese día de la semana. El docente puede ajustarlas.
- **RN-22 Validaciones de la sesión.** La salida debe ser posterior a la entrada (RN-17), una sesión no puede empalmarse con otra sesión del mismo docente en la misma fecha (misma semántica de RN-18) y la fecha no puede ser futura respecto a la fecha actual en `America/Mexico_City`.
- **RN-23 Sesiones de periodos emitidos.** Una sesión cuya fecha cae en un periodo con recibo emitido no se puede crear, editar ni borrar (ver RN-28).

### 2.8 Recibo de nómina

- **RN-24 Periodo quincenal.** Quincena 1: días 1 al 15 del mes. Quincena 2: día 16 al último día del mes (28, 29, 30 o 31 según corresponda). Estos límites son constantes con nombre en un solo módulo (sección 4.4).
- **RN-25 Cálculo automático.** El recibo se calcula a partir de la bitácora del periodo. Por cada asignación: `horas = suma de minutos de sus sesiones / 60`; `importe = horas × tarifa de la asignación`. El **total bruto** es la suma de los importes. El docente nunca escribe montos.
- **RN-26 Dinero exacto.** Todo cálculo monetario usa `Decimal` en Python y `NUMERIC` en PostgreSQL. **Jamás `float`.** Los importes se redondean a 2 decimales con `ROUND_HALF_UP` a nivel de renglón (asignación); el total es la suma de los renglones ya redondeados. Las horas se muestran con 2 decimales.
- **RN-27 Contenido del recibo.** Encabezado institucional con logo, título "Recibo de Nómina", folio, periodo, datos del docente, desglose por materia y carrera (horas, tarifa, importe) y total. Se puede descargar en PDF.
- **RN-28 Vista previa y emisión.** Mientras el periodo no se emite, el docente ve una **vista previa** calculada en vivo. Al **emitir** (con confirmación), el sistema guarda una copia fija del recibo (renglones con horas, tarifa e importe) y le asigna un folio. A partir de ahí el recibo no cambia aunque cambien los catálogos, y la bitácora de ese periodo queda bloqueada (RN-23).
- **RN-29 Un recibo por periodo.** Un docente tiene a lo más un recibo emitido por periodo (año, mes, quincena). Solo se pueden emitir periodos ya concluidos o el periodo en curso; nunca periodos futuros. No se emite un recibo sin sesiones.
- **RN-30 Folio.** El folio es único, consecutivo y lo genera la base de datos (secuencia). Formato: `{PREFIJO}-{AAAA}{MM}-Q{n}-{consecutivo de 6 dígitos}`, por ejemplo `NOM-202610-Q2-000042`. El prefijo es configurable por variable de entorno.
- **RN-31 Fuera de alcance.** No se calculan ISR, IMSS ni otras deducciones en esta versión. Se documenta como mejora futura.

---

## 3. Stack técnico

Stack definitivo. Cambiar una pieza requiere registrar la decisión en la sección 12.

### 3.1 Backend (`backend/`)

| Pieza | Elección |
| --- | --- |
| Lenguaje | Python 3.12+ (`requires-python = ">=3.12"`) |
| Framework | FastAPI |
| Validación | Pydantic v2 + pydantic-settings (configuración) |
| ORM | SQLAlchemy 2.0, estilo tipado con `Mapped[]` y `mapped_column()` |
| Migraciones | Alembic |
| Driver | psycopg 3 (URL `postgresql+psycopg://`) |
| Autenticación | JWT (PyJWT) en cookie `httpOnly` |
| Contraseñas | Argon2id (vía `pwdlib[argon2]`); bcrypt solo si Argon2 no estuviera disponible |
| Dependencias | uv (`pyproject.toml` + `uv.lock` versionado) |
| Calidad | Ruff (lint + formato), mypy en modo estricto, pytest contra `nomina_docente_test` |

### 3.2 Frontend (`frontend/`)

| Pieza | Elección |
| --- | --- |
| Framework | Next.js 16 con App Router y Turbopack (`cacheComponents` y `partialPrefetching` activos, valores por defecto de la versión) |
| Runtime | Node.js 24 LTS (`frontend/.nvmrc`, `engines` en `package.json`) |
| Lenguaje | TypeScript con `strict: true`; prohibido `any` |
| Estilos | Tailwind CSS con tokens en variables CSS |
| Estilos (versión) | Tailwind CSS 4, configuración en CSS (`@theme inline` en `src/styles/globals.css`), sin `tailwind.config` |
| Componentes | shadcn/ui, estilo `radix-nova` sobre Radix (adaptado a las reglas de diseño de la sección 7) |
| Animación | Framer Motion (respetando `prefers-reduced-motion`) |
| Formularios | React Hook Form + Zod |
| Datos del servidor | TanStack Query |
| Paquetes | npm (`package-lock.json` versionado) |
| Calidad | ESLint + Prettier |

### 3.3 Base de datos

- PostgreSQL local (versión instalada en el equipo de desarrollo: 18).
- `nomina_docente` para desarrollo y `nomina_docente_test` para pruebas automatizadas.
- Extensiones: `btree_gist` (restricciones de no empalme, sección 5.4) y `unaccent` (comparación de nombres de materia, RN-09), instaladas en su propio esquema `extensions`. Las crea **solo** la migración inicial de Alembic (`CREATE EXTENSION IF NOT EXISTS … SCHEMA extensions`), nunca un paso manual ni un script.
- Conexión: variables separadas `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y `DB_NAME_TEST`. `Settings` arma la URL con `sqlalchemy.URL.create` (codifica bien contraseñas con caracteres especiales) y el script de bases lee las mismas variables.

### 3.4 Comunicación frontend ↔ backend

- API REST versionada bajo `/api/v1`.
- En desarrollo, Next.js reenvía `NEXT_PUBLIC_API_BASE_PATH/*` (`/api/v1/*`) al backend mediante `rewrites` en `next.config.ts` (destino tomado de la variable `API_PROXY_TARGET`, validada con Zod en `src/config/server-env.ts`). Así el navegador solo habla con un origen, la cookie de sesión es de primera parte y se evitan problemas de CORS. CORS se configura de todos modos con una lista blanca explícita (`CORS_ORIGINS`).
- Formato de errores único (sección 4.5).

---

## 4. Arquitectura limpia y cero valores hardcodeados

**Esta sección es obligatoria y no negociable.** Ver también [`docs/arquitectura.md`](docs/arquitectura.md).

### 4.1 Raíz del repositorio ordenada

En la raíz **solo** pueden existir:

```
README.md   CLAUDE.md   LICENSE   .gitignore   .editorconfig
backend/    frontend/   docs/     scripts/
```

Nada más: ningún archivo de código, configuración de una app ni archivos sueltos. Cada app tiene su propia configuración y su propio `.env.example` dentro de su carpeta (`backend/.env.example` y `frontend/.env.example`). La carpeta `.git/` es la única excepción técnica.

### 4.2 Estructura del backend (Clean Architecture por capas, layout `src/`)

```
backend/
├── src/app/
│   ├── main.py              → solo crea la app (create_app) y registra routers y middlewares
│   ├── __main__.py          → arranque de Uvicorn con host/puerto de Settings (`python -m app`)
│   ├── core/                → config (pydantic-settings), seguridad, logging, middleware, excepciones, constantes
│   ├── db/                  → motor, sesión (get_db), base declarativa con convención de nombres, mixins y CHECK reutilizables
│   ├── models/              → modelos ORM (un archivo por entidad, registrados en __init__.py)
│   ├── schemas/             → modelos Pydantic de entrada/salida
│   ├── repositories/        → acceso a datos (sin lógica de negocio)
│   ├── services/            → lógica de negocio (sin saber de HTTP)
│   ├── api/v1/
│   │   ├── router.py        → router raíz con el prefijo /api/v1
│   │   ├── dependencies.py  → raíz de composición: servicio + repositorios + sesión
│   │   └── routers/         → endpoints delgados (validan, llaman al service, responden)
│   ├── seeds/               → datos semilla: data/*.json, validación (schemas, loader) y carga idempotente (runner)
│   └── utils/               → utilidades sin estado (formato del folio)
├── alembic/                 → migraciones (URL desde Settings, nunca en alembic.ini)
├── alembic.ini
├── tests/
│   ├── conftest.py          → fixtures; las pruebas @pytest.mark.db se saltan si no hay base de pruebas
│   ├── factories.py, helpers.py → fábricas de datos y violates() (exige que la BASE rechace)
│   ├── unit/                → espejo de src/app/
│   └── integration/         → espejo de src/app/ (+ db/ para el esquema y las migraciones)
├── pyproject.toml           → dependencias y configuración de Ruff, mypy, pytest y coverage
├── uv.lock
├── .python-version
└── .env.example
```

**Regla de dependencias:** `routers → services → repositories → models`. Nunca al revés. Nunca un router consulta la base de datos directamente.

| Capa | Puede importar | No puede |
| --- | --- | --- |
| `api/v1/routers` | `services`, `schemas`, `api/v1/dependencies`, dependencias de `core` | usar `Session`, `repositories` o `models` |
| `api/v1/dependencies.py` | `services`, `repositories`, `db.session`, `core` | contener lógica (solo construye objetos) |
| `services` | `repositories`, `schemas`, `core` | conocer `Request`, `Response`, `HTTPException` ni códigos HTTP |
| `repositories` | `models`, `db` | aplicar reglas de negocio |
| `models` | `db.base` | importar cualquier capa superior |
| `schemas` | tipos y validadores | importar modelos ORM o repositorios |

Detalles:

- Los servicios lanzan **excepciones de dominio** (`core/exceptions.py`, p. ej. `NotFoundError`, `ConflictError`, `BusinessRuleError`). Un manejador central las traduce a HTTP.
- Los servicios reciben sus repositorios por inyección (dependencias de FastAPI), lo que permite probarlos con dobles.
- La transacción la controla la capa de servicio (unidad de trabajo por petición); los repositorios no hacen `commit`.
- Los schemas de Pydantic están separados de los modelos ORM. Nunca se devuelve un modelo ORM directamente.

### 4.3 Estructura del frontend (organizada por funcionalidades)

```
frontend/
├── src/
│   ├── app/                 → solo rutas y layouts de Next.js
│   ├── features/            → auth/, assignments/, schedules/, logbook/, payroll/
│   │   │                      (+ system-status/, temporal de la etapa 1)
│   │   └── <feature>/       → components/, hooks/, api/, schemas/, types/
│   ├── components/ui/       → componentes base (shadcn)
│   ├── components/layout/   → encabezado, barra lateral, providers globales (TanStack Query)
│   ├── lib/                 → api-client.ts, api-error.ts, query-client.ts, formateadores, utils (cn)
│   ├── config/              → env.ts (públicas), server-env.ts (solo servidor), validadas con Zod
│   ├── constants/           → textos, mensajes de error, rutas, HTTP, localización
│   └── styles/              → tokens.css (variables CSS) y globals.css (mapeo a Tailwind)
├── public/brand/            → logos oficiales
├── next.config.ts           → rewrites del proxy hacia el backend
├── components.json          → configuración de shadcn/ui
├── eslint.config.mjs  .prettierrc.json  tsconfig.json  .nvmrc
├── AGENTS.md                → reglas para agentes que `next dev` regenera; se versiona
└── .env.example
```

Reglas:

- `app/` no contiene lógica: compone componentes de `features/` y `components/`.
- Una feature no importa archivos internos de otra feature; lo compartido sube a `components/`, `lib/` o `constants/`.
- Todo acceso a la API pasa por el cliente HTTP de `lib/` y por los módulos `features/<feature>/api/`. Los componentes nunca llaman a `fetch` directamente (ESLint lo prohíbe fuera de `lib/api-client.ts`). Cada respuesta se valida con un schema de Zod.
- Los schemas de Zod viven en `features/<feature>/schemas/` y sus mensajes salen de `constants/`.

### 4.4 Cero hardcodeo (aplica a todo el proyecto, siempre)

- **Tarifas por hora:** tabla catálogo `hourly_rates` con datos semilla (125, 135, 145). La asignación la referencia con llave foránea y el frontend obtiene las opciones desde la API. **No** se usa un `CHECK` con valores fijos (esta regla sustituye la idea original de un `CHECK (rate IN (125, 135, 145))`).
- **Carreras, materias y tarifas:** siempre desde la base de datos; nunca listas escritas en el frontend.
- **Configuración** (URLs, puertos, credenciales, duración del token, CORS, nombre de la institución, prefijo de folio): variables de entorno leídas por un módulo de configuración tipado (`backend/src/app/core/config.py` con pydantic-settings; `frontend/src/config/`). Si falta una variable obligatoria, la app **falla al iniciar** con un mensaje claro que nombra la variable.
- **Reglas de periodo, formatos y zona horaria:** constantes con nombre en un solo módulo por app (`backend/src/app/core/constants.py`; `frontend/src/constants/`). Ejemplos: `FIRST_FORTNIGHT_LAST_DAY = 15`, `TIMEZONE = "America/Mexico_City"`, `MONEY_DECIMAL_PLACES = 2`. Nada de números mágicos repartidos por el código.
- **Textos de la interfaz y mensajes de error:** centralizados en `frontend/src/constants/`, no regados en los componentes.
- **Colores, espaciados y tipografía:** tokens de diseño en variables CSS expuestas a Tailwind. Prohibido escribir colores sueltos (`#1a2b3c`, `rgb(...)`, `bg-[#...]`) dentro de componentes.
- **Datos semilla** (carreras, tipos de carrera, tarifas, roles): en `backend/src/app/seeds/data/*.json`, separados de la lógica, cargados por un comando idempotente (`scripts/seed.sh`) que inserta lo nuevo, actualiza lo que cambió y nunca borra.

### 4.5 Principios de código

- SOLID, separación de responsabilidades, funciones pequeñas con un solo propósito y nombres descriptivos.
- Tipado estricto en todo: mypy estricto en Python; `strict` en TypeScript, sin `any` (usar `unknown` y estrechar).
- **Manejo de errores centralizado:**
  - Backend: excepciones de dominio → un manejador global → respuesta JSON consistente:
    ```json
    { "error": { "code": "SCHEDULE_OVERLAP", "message": "…", "details": {} } }
    ```
    `code` es estable y en inglés (`SCREAMING_SNAKE_CASE`); el frontend lo usa para mostrar el texto en español desde `constants/`. Los errores de validación de Pydantic se adaptan al mismo formato, con `details.fields`.
  - Frontend: un solo lugar (`lib/`) transforma errores de la API en mensajes para el usuario.
- Fechas y horas: en base de datos, `timestamptz` para marcas de tiempo (guardadas en UTC) y `date`/`time` para fecha de sesión y horarios, interpretados en `America/Mexico_City`.
- `scripts/` contiene utilidades para el desarrollador (por ejemplo, crear las bases de datos locales), documentadas en el README.

---

## 5. Modelo de datos

Implementado en la etapa 2. Referencia completa (diagrama entidad-relación, diccionario de datos y justificación de cada decisión): [`docs/base-de-datos.md`](docs/base-de-datos.md). Tablas y columnas en inglés `snake_case`, nombres de tabla en plural.

### 5.1 Identificadores y columnas comunes

- Toda tabla tiene `id` `bigint GENERATED ALWAYS AS IDENTITY` (la aplicación no puede escribirlo).
- Las entidades del docente que expone la API (`users`, `subjects`, `assignments`, `schedules`, `logbook_entries`, `payroll_receipts`) tienen además `public_id uuid` (`gen_random_uuid()`). **La API nunca expone el `id` secuencial**: usa `public_id`.
- `created_at` / `updated_at` son `timestamptz` con `now()` por defecto; `updated_at` lo mantiene un trigger de la base (`trg_<tabla>_set_updated_at`). Mixins en `backend/src/app/db/mixins.py`.

### 5.2 Tablas

| Tabla | Propósito | Columnas clave |
| --- | --- | --- |
| `users` | Identidad y credenciales | `email` (único, guardado normalizado; `CHECK email = lower(btrim(email))`), `password_hash`, `is_active`, `last_login_at` |
| `roles` | Catálogo de roles | `code` (único: `teacher`; `admin` cargado inactivo, reservado), `name`, `description`, `is_active` |
| `user_roles` | Relación N:M usuario–rol | `user_id`, `role_id` (PK compuesta), `created_at` |
| `teachers` | Perfil del docente (1:1) | `user_id` (único, FK), `first_names`, `paternal_surname`, `maternal_surname` (nulo permitido), `employee_number` (único, nulo permitido) |
| `career_types` | Catálogo de tipos de carrera | `code` (`engineering`, `bachelor`), `name` |
| `careers` | Catálogo de carreras | `code` (único, mayúsculas), `name` (único), `career_type_id`, `is_active` |
| `hourly_rates` | Catálogo de tarifas | `amount` `NUMERIC(10,2)` único, `CHECK (amount > 0)`, inmutable por trigger, `is_active` |
| `subjects` | Materias del docente | `teacher_id`, `name`, `code` (opcional), `name_normalized` (columna generada con `normalize_name()` = `unaccent` + minúsculas + espacios simples); único `(teacher_id, name_normalized)` |
| `assignments` | Docente + materia + carrera + tarifa | `teacher_id`, `subject_id`, `career_id`, `hourly_rate_id`, `is_active`; único parcial `(teacher_id, subject_id, career_id) WHERE is_active` |
| `schedules` | Horario semanal | `assignment_id`, `teacher_id`, `weekday` (1 = lunes … 7 = domingo, ISO 8601), `start_time`, `end_time` |
| `logbook_entries` | Sesiones impartidas | `assignment_id`, `teacher_id`, `session_date`, `start_time`, `end_time`, `notes` |
| `payroll_receipts` | Recibo emitido (copia fija) | `teacher_id`, `folio_number` (secuencia de la base), `folio` (único), `year`, `month`, `fortnight`, `period_start`, `period_end`, `teacher_full_name` y `teacher_employee_number` (copias), `total_minutes`, `total_hours` (generada), `total_amount` `NUMERIC(12,2)`, `issued_at`; único `(teacher_id, year, month, fortnight)` |
| `payroll_receipt_lines` | Renglones congelados del recibo | `receipt_id`, `teacher_id`, `assignment_id`, `subject_name`, `career_name`, `minutes`, `hours` (generada), `hourly_rate`, `amount` |

Tipos: dinero `NUMERIC(10,2)` (tarifas) y `NUMERIC(12,2)` (importes y totales), horas `NUMERIC(8,2)`, minutos `integer`. Longitudes y precisiones son constantes en `core/constants.py`.

### 5.3 Roles sin rehacer tablas

La identidad (`users`) está separada del perfil (`teachers`) y los permisos se asignan por `user_roles`. En esta versión todo usuario registrado recibe el rol `teacher`. Agregar un administrador en el futuro es activar el rol `admin` y, si hace falta, crear una tabla de perfil propia; las tablas existentes no cambian.

### 5.4 Restricciones en base de datos (tercer nivel de validación)

- `CHECK (end_time > start_time)` en `schedules` y `logbook_entries` (RN-17); horas sin segundos (`*_whole_minute`).
- `CHECK (weekday BETWEEN 1 AND 7)`, `CHECK (fortnight IN (1, 2))`, `CHECK (month BETWEEN 1 AND 12)`; `period_start` y `period_end` deben coincidir exactamente con año, mes y quincena (incluido febrero bisiesto).
- Textos recortados y no vacíos (`*_trimmed`), formato de claves de catálogo y de correo.
- **No empalme (RN-18, RN-22):** `schedules` y `logbook_entries` guardan `teacher_id` de forma redundante, amarrado con una FK compuesta `(assignment_id, teacher_id) → assignments(id, teacher_id)` para que nunca diverja. La migración crea `CREATE TYPE timerange AS RANGE (subtype = time, subtype_diff = time_subtype_diff)` y las restricciones de exclusión con `btree_gist`:
  - `schedules`: `EXCLUDE USING gist (teacher_id WITH =, weekday WITH =, timerange(start_time, end_time, '[)') WITH &&)`.
  - `logbook_entries`: `EXCLUDE USING gist (teacher_id WITH =, session_date WITH =, timerange(start_time, end_time, '[)') WITH &&)`.
  El servicio valida antes (para dar un mensaje claro) y la base garantiza el invariante ante cualquier condición de carrera.
- **FK compuestas de aislamiento (RN-04):** la materia de una asignación y la asignación de un renglón de recibo deben ser del mismo docente.
- **Triggers:** `trg_hourly_rates_amount_immutable` (RN-12), `trg_logbook_entries_period_locked` (RN-23: no se crea, edita ni borra bitácora de un periodo emitido), `trg_payroll_receipts_immutable` y `trg_payroll_receipt_lines_immutable` (RN-28). Responden con SQLSTATE `23000` y el nombre del trigger como nombre de restricción.
- `CHECK (amount = round(minutes * hourly_rate / 60, 2))` en `payroll_receipt_lines` (RN-25, RN-26).
- **Borrado:** `ON DELETE RESTRICT` por defecto. `CASCADE` solo de `assignments` a `schedules` (RN-15) y de `users` a `user_roles`. De `payroll_receipts` a sus renglones es `RESTRICT`: los recibos nunca se borran.
- Las líneas y el encabezado del recibo copian nombres, tarifa y datos del docente (RN-28): el recibo emitido no depende de que los catálogos sigan iguales.
- **Lo que valida solo el servicio:** fecha de sesión no futura (RN-22) y periodo no futuro (RN-29), porque un `CHECK` con `current_date` no es válido; total del recibo = suma de renglones (involucra varias filas).
- Nombres de restricciones e índices según la convención de `db/base.py` (`pk_`, `fk_`, `uq_`, `ck_`, `ex_`, `ix_`, y `trg_` para triggers); una prueba lo verifica.

---

## 6. Seguridad

- **Contraseñas:** hash Argon2id; nunca se registran ni se devuelven. Longitud mínima de 8 caracteres (constante con nombre).
- **Sesión:** JWT firmado (HS256 por defecto, configurable) con `sub` = `users.public_id` (UUID, nunca el `id` secuencial) y expiración configurable (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Cookie:** `httpOnly`, `SameSite=Lax`, `Secure` configurable (`AUTH_COOKIE_SECURE`, `false` solo en desarrollo local por HTTP), `Path=/`.
- **CSRF:** como la sesión vive en una cookie, las peticiones que modifican datos (`POST`, `PUT`, `PATCH`, `DELETE`) usan el patrón *double-submit*: una cookie legible `csrf_token` y el encabezado `X-CSRF-Token` deben coincidir.
- **Autorización:** toda consulta se filtra por el docente autenticado en la capa de repositorio (RN-04).
- **Mensajes de autenticación:** el login falla con un mensaje genérico ("Correo o contraseña incorrectos") para no revelar qué cuentas existen.
- **Secretos:** solo en `.env` (ignorado por git). `JWT_SECRET` es obligatorio y debe tener al menos 32 caracteres; si no, el backend no inicia.
- Revisión de seguridad formal en la etapa 10 (OWASP Top 10, dependencias, cabeceras).

---

## 7. Reglas de diseño

Objetivo: que el sistema se vea como un sistema universitario serio, no como una plantilla hecha con IA.

### 7.1 Estética

- Institucional, sobria y confiable. Nada de estética de "startup genérica".
- **Prohibido:**
  - degradados morado/azul;
  - glassmorphism;
  - emojis en la interfaz;
  - ilustraciones genéricas;
  - sombras exageradas;
  - todo con bordes súper redondeados;
  - textos tipo "¡Bienvenido de nuevo! 🚀";
  - tarjetas idénticas repetidas sin jerarquía;
  - lorem ipsum o datos de relleno.
- Jerarquía visual clara: títulos, datos principales y acciones primarias se distinguen a simple vista.

### 7.2 Color y tokens

- Paleta basada en los colores institucionales del TESH, que se definirá en la etapa 5 cuando lleguen los logos.
- Mientras tanto: neutros sobrios y **un color primario provisional configurable desde un solo lugar** (variables CSS en `frontend/src/styles/`).
- Ningún componente define colores, espaciados ni tipografías propios: todo sale de los tokens.

### 7.3 Textos

- Español de México real, claro y corto, escrito como lo haría una institución.
- Los mensajes de error dicen **qué pasó y cómo corregirlo**. Ejemplo: "El horario se empalma con Bases de Datos (lunes 10:00–12:00). Elige otra hora de entrada o de salida."
- Todos los textos viven en `frontend/src/constants/`.

### 7.4 Formatos (consistentes en todo el sistema)

| Dato | Formato | Ejemplo |
| --- | --- | --- |
| Moneda | `Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })` + sufijo `MXN` | `$1,250.00 MXN` |
| Fecha larga | día, mes en minúsculas y año | `15 de octubre de 2026` |
| Hora | **24 horas** con dos dígitos (decisión del equipo; se usa en todo el sistema) | `07:00`, `14:30` |
| Horas trabajadas | 2 decimales | `12.50 h` |
| Periodo | quincena, mes y año | `2.ª quincena de octubre de 2026 (16 al 31 de octubre)` |

Los formateadores están en `frontend/src/lib/` y el backend usa las mismas reglas para el PDF.

### 7.5 Animación

- Sutil y con propósito: transiciones de página, retroalimentación de acciones, estados de carga con *skeleton*.
- Se respeta `prefers-reduced-motion`: con la preferencia activa, las animaciones se reducen a cambios instantáneos o de opacidad.
- Duraciones y curvas definidas como tokens, no números sueltos.

### 7.6 Accesibilidad y responsividad

- Contraste mínimo WCAG 2.2 AA.
- Navegación completa con teclado y foco visible.
- `label` asociado a todos los campos; errores de formulario anunciados (`aria-describedby`, `aria-invalid`).
- Escritorio primero, funcional en celular.

---

## 8. Convenciones del equipo

- **Idioma:** código (variables, funciones, clases, archivos) en inglés; textos visibles al usuario en español; tablas y columnas en inglés `snake_case`. La documentación del repositorio está en español.
- **Commits:** Conventional Commits en español, en modo imperativo de tercera persona. Ejemplos: `feat: agrega registro de docentes`, `fix: corrige el cálculo de la segunda quincena`, `docs: actualiza la hoja de ruta`. Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`. Los mensajes de commit **no** llevan la línea `Co-Authored-By` ni ninguna otra atribución automática.
- **Ramas:** `main` siempre estable. Trabajo de cada etapa en `etapa-XX-descripcion` cuando aplique.
- **Secretos:** nunca se suben. Todo va en `.env` (ignorado) y se documenta en el `.env.example` de cada app con valores de ejemplo, nunca reales.
- **Definición de terminado de cada etapa:** código funcionando, pruebas pasando, lint y tipos sin errores, y CLAUDE.md actualizado (hoja de ruta + registro de avances).
- **Limpieza:** sin código muerto, sin `TODO` sin explicación (si existe, dice qué falta y en qué etapa se resuelve) y sin comentarios obvios. Comentarios solo donde aportan el *porqué*.
- **Antes de cambios grandes:** revisar lo que ya existe para no duplicar ni romper.
- **Pruebas:** cada regla de negocio (`RN-XX`) tiene al menos una prueba; el cálculo de nómina se prueba con casos límite (febrero bisiesto, día 15/16, último día del mes, minutos fraccionarios).
- **Push:** nunca se hace `push` sin autorización explícita del responsable del repositorio.

---

## 9. Entorno de desarrollo

### 9.1 Herramientas requeridas

| Herramienta | Versión mínima | Uso |
| --- | --- | --- |
| git | 2.40 | control de versiones |
| Python | 3.12 | backend (uv puede administrar la versión; `backend/.python-version` fija 3.13) |
| uv | 0.5 | dependencias y entorno virtual del backend |
| Node.js | 24 LTS (`frontend/.nvmrc`) | frontend |
| npm | 10 | dependencias del frontend |
| PostgreSQL / psql | 16 | base de datos y scripts |

### 9.2 Plataforma

- **Entorno principal: Windows 11 con Git Bash.** El proyecto se mantiene compatible con **Linux**. Los scripts de `scripts/` son Bash y funcionan en ambos (en Windows agregan por su cuenta las rutas habituales de uv, Node.js y PostgreSQL si la terminal no las tiene).
- Ubicación del repositorio en el equipo actual: `C:\dev\nomina-docente` (fuera de OneDrive, para evitar bloqueos de sincronización sobre `node_modules/` y `.venv/`).
- Equipo actual (verificado en la etapa 1, 2026-10-25):

  | Herramienta | Versión | Ubicación |
  | --- | --- | --- |
  | git | 2.51.1 | Git for Windows (Git Bash) |
  | Python | 3.13.2 | `python` (no existe `python3`) |
  | uv | 0.13.5 | `C:\Users\jorge\.local\bin` (instalador oficial, ya en el `PATH` de usuario) |
  | Node.js / npm | 24.22.1 LTS / 11.19.1 | `C:\Program Files\nodejs` (winget `OpenJS.NodeJS.LTS`) |
  | PostgreSQL / psql | 18.3 | servicio `postgresql-x64-18`; `C:\Program Files\PostgreSQL\18\bin` agregado al `PATH` de usuario |

- La consola de Windows no usa UTF-8 por defecto: `scripts/dev.sh` exporta `PYTHONUTF8=1`. Los mensajes del servidor PostgreSQL en español pueden verse con acentos dañados en la terminal; es solo de visualización.
- Finales de línea: LF en todo el repositorio (`.editorconfig`, `endOfLine: lf` en Prettier). En Windows, el repositorio local se configura con `git config core.autocrlf false` y `git config core.eol lf` (no se usa `.gitattributes` para respetar la regla de raíz ordenada, sección 4.1).

### 9.3 Puertos y URLs locales

| Servicio | URL |
| --- | --- |
| Backend (FastAPI) | `http://localhost:8000` (documentación interactiva en `/docs`) |
| Frontend (Next.js) | `http://localhost:3000` |
| PostgreSQL | `localhost:5432` |

### 9.4 Variables de entorno

Documentadas en [`backend/.env.example`](backend/.env.example) y [`frontend/.env.example`](frontend/.env.example). Toda variable nueva se agrega primero ahí y en el módulo de configuración tipado (`backend/src/app/core/config.py`, `frontend/src/config/`). Todas son obligatorias: no hay valores por defecto en el código.

Variables que deben coincidir entre apps: `CSRF_COOKIE_NAME` (backend) = `NEXT_PUBLIC_CSRF_COOKIE_NAME` (frontend); `API_HOST`/`API_PORT` (backend) ↔ `API_PROXY_TARGET` (frontend); `DEV_SERVER_PORT` (frontend) debe estar en `CORS_ORIGINS` (backend).

### 9.5 Comandos habituales

| Tarea | Comando (desde la raíz) |
| --- | --- |
| Preparar entorno | `bash scripts/setup.sh` |
| Crear bases de datos | `bash scripts/create-databases.sh` |
| Aplicar migraciones | `bash scripts/migrate.sh` (con argumentos: `current`, `downgrade base`…) |
| Cargar datos semilla | `bash scripts/seed.sh` |
| Levantar todo | `bash scripts/dev.sh` |
| Verificar backend | `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest` |
| Verificar frontend | `cd frontend && npm run check && npm run build` |

---

## 10. Hoja de ruta

- [x] **0. Cimientos y CLAUDE.md**
- [x] **1. Arquitectura base del backend y frontend** (proyectos inicializados y conectados)
- [x] **2. Base de datos:** modelos, migraciones y catálogo de carreras
- [ ] **3. Autenticación:** registro, login, sesión y seguridad
- [ ] **4. Lógica de negocio:** materias, asignaciones, horarios, bitácora y cálculo de nómina
- [ ] **5. Sistema de diseño** (colores, tipografía, componentes)
- [ ] **6. Pantallas:** login, registro y panel principal
- [ ] **7. Pantallas:** asignaciones, horarios y bitácora
- [ ] **8. Recibo de nómina y exportación a PDF**
- [ ] **9. Animaciones y microinteracciones**
- [ ] **10. Pruebas, QA y revisión de seguridad**
- [ ] **11. Logos, pulido final y documentación**

### Mejoras futuras (fuera de alcance de esta versión)

- Cálculo de ISR, IMSS y otras deducciones.
- Rol de administrador (gestión de catálogos, consulta de docentes).
- Cancelación o reexpedición de recibos emitidos.
- Despliegue en servidor institucional.

---

## 11. Decisiones pendientes

| Tema | Etapa | Opciones / criterio |
| --- | --- | --- |
| Generación del PDF del recibo | 8 | Generarlo en el backend (una sola fuente de cálculo y formato). Elegir la biblioteca en la etapa 8 considerando que funcione sin dependencias de sistema complicadas en Linux y Windows |
| Paleta institucional y tipografía | 5 / 11 | Depende de los logos oficiales del TESH |
| Usuario de base de datos de la app | 2 | Hoy se usa `postgres` en desarrollo local. Evaluar un rol propio con privilegios mínimos (dueño de las bases) antes de la revisión de seguridad de la etapa 10 |
| Migrar el `TestClient` a `httpx2` | 3 o posterior | Starlette 1.x anuncia el cambio; se adopta cuando FastAPI lo incluya en sus dependencias de pruebas. Mientras, el aviso se filtra en `pyproject.toml` |

---

## 12. Registro de avances

Formato: fecha, etapa, qué se hizo y decisiones importantes. Lo más reciente va al final.

### 2026-10-25 — Etapa 0: Cimientos y CLAUDE.md

**Qué se hizo**

- Estructura del monorepo: `backend/`, `frontend/` (con `public/brand/`), `docs/` y `scripts/`, cada uno con su README.
- CLAUDE.md, README.md, `docs/arquitectura.md` (diagramas Mermaid de componentes, capas y modelo conceptual), `.gitignore`, `.editorconfig`, `LICENSE` (MIT) y `.env.example` por app.
- Repositorio git inicializado en `main` con el primer commit. Sin `push`.

**Verificación de herramientas** (equipo del desarrollador)

| Herramienta | Estado |
| --- | --- |
| git | 2.51.1 |
| Python | 3.13.2 (como `python`; `python3` no existe en Windows) |
| uv | no instalado |
| Node.js / npm | 25.9.0 / 11.12.1 (Node 25 es versión *Current*, no LTS) |
| PostgreSQL | 18.3, servicio `postgresql-x64-18` en ejecución; `psql` no está en el `PATH` |

**Decisiones**

1. **Tarifas como catálogo** (`hourly_rates`) con llave foránea, en lugar de un `CHECK` con valores fijos (corrección explícita del responsable).
2. **Tarifas inmutables y recibos congelados** (RN-12, RN-28): el recibo emitido guarda copia de horas, tarifa, materia y carrera para que el historial nunca cambie en silencio.
3. **Materias por docente** (RN-08, RN-09): cada docente administra sus materias; respeta el aislamiento de datos y no requiere administrador. Un catálogo institucional de materias queda como mejora futura.
4. **Identidad separada del perfil** (`users` / `teachers` / `roles` / `user_roles`) para agregar roles sin rehacer tablas.
5. **No empalme garantizado en base de datos** con restricciones de exclusión (`btree_gist`), además de la validación del servicio.
6. **Formato de hora de 24 h** en todo el sistema.
7. **Proxy de Next.js** (`rewrites`) para que el navegador hable con un solo origen y la cookie de sesión sea de primera parte; CSRF con *double-submit*.
8. **Zona horaria, días de quincena y formatos** como constantes en código (no variables de entorno), porque son reglas de negocio, no configuración del despliegue.
9. **Sin `.gitattributes`** para respetar la regla de raíz; los finales de línea se controlan con `.editorconfig` y la configuración local de git.

### 2026-10-25 — Etapa 1: Arquitectura base del backend y frontend

**Qué se hizo**

- **Entorno (Windows 11 + Git Bash):** uv 0.13.5 instalado con el instalador oficial; `C:\Program Files\PostgreSQL\18\bin` agregado al `PATH` de usuario sin duplicados; Node 25 (*Current*) sustituido por Node 24.22.1 LTS con winget. El repositorio vive en `C:\dev\nomina-docente`; se verificó que no quedan rutas de OneDrive en archivos del proyecto.
- **Backend:** proyecto uv con layout `src/app/` y todas las capas. `Settings` con pydantic-settings (todas las variables obligatorias y error claro que nombra cada variable), logging JSON con `request_id`, middleware de contexto (`X-Request-ID`), excepciones de dominio con manejadores globales (formato único de error, también para 404/405, validación y errores inesperados), motor y sesión SQLAlchemy 2 síncronos con psycopg 3, base declarativa con convención de nombres, `create_app()` y `GET /api/v1/health` (router → servicio → repositorio). Alembic configurado sin URL en `alembic.ini` y con plantilla de migración compatible con Ruff y mypy. Ruff y mypy estricto. 22 pruebas: 21 pasan y 1 se salta (necesita la base de pruebas).
- **Frontend:** Next.js 16.4.3 (Turbopack, React 19.3) creado en una carpeta temporal y movido a `frontend/` conservando el README. Estructura por features, shadcn/ui inicializado, TanStack Query, React Hook Form, Zod, Framer Motion y Prettier con el plugin de Tailwind. Variables de entorno validadas con Zod, proxy `rewrites` hacia FastAPI, cliente HTTP tipado (valida respuestas con Zod, CSRF double-submit, errores centralizados), tokens de diseño provisionales y página temporal de estado del sistema.
- **Scripts:** `setup.sh`, `create-databases.sh`, `dev.sh` y `lib/common.sh`, probados en Git Bash.
- **Verificación:** Ruff, formato, mypy y pytest en verde; ESLint, `tsc` y `next build` en verde; con `dev.sh`, `GET http://localhost:3000/api/v1/health` responde a través del proxy (con `degraded`/`unavailable` hasta que se configure la contraseña de PostgreSQL). Ctrl+C detiene ambos servidores y libera los puertos.

**Decisiones**

1. **Node 24 LTS en lugar de Node 25.** winget no permite instalar una versión menor encima de una mayor (`WIX_DOWNGRADE_DETECTED`), así que se desinstaló Node 25 antes de instalar la LTS. El único paquete global (`pnpm`) sigue funcionando. `.nvmrc` = `24` y `engines.node` = `>=24.0.0`.
2. **Conexión a la base en variables separadas** (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_NAME_TEST`) en lugar de `DATABASE_URL`: el script de bases y la app leen lo mismo, y `URL.create` codifica las contraseñas con caracteres especiales.
3. **Contraseña de PostgreSQL no adivinada.** El servidor exige `scram-sha-256` y no hay `pgpass`. `backend/.env` quedó con el marcador `PENDIENTE-…` y `create-databases.sh` lo detecta y se detiene con un mensaje claro.
4. **Usuario `postgres` en desarrollo local** para no exigir un rol adicional; el rol propio con privilegios mínimos queda como decisión pendiente (sección 11).
5. **`btree_gist` también desde el script** (idempotente). La migración de la etapa 2 sigue siendo la fuente de verdad (sección 3.3).
6. **Raíz de composición `api/v1/dependencies.py`:** construye servicios con sus repositorios, así los routers no conocen `Session` ni repositorios.
7. **Salud con 200 y `status: degraded`** cuando la base no responde, en lugar de 503: la página de estado puede mostrar el detalle y el formato de error queda reservado para errores reales.
8. **Proxy con `rewrites`** y no con un *route handler*: reenvía `Cookie`, `Set-Cookie` y el encabezado CSRF sin código propio. Cuando el backend está apagado, el proxy responde 500 sin JSON y el cliente lo convierte en `BACKEND_UNAVAILABLE`.
9. **Fuentes del sistema** en lugar de Geist (`next/font/google`): el build no depende de internet y la tipografía definitiva se decide en la etapa 5. Se quitaron el favicon y los SVG de demostración de Next.js.
10. **Variante `dark:` ligada a la clase `.dark`** y sin tokens oscuros: el tema oscuro no está en el alcance, y así el sistema operativo no activa estilos oscuros incompletos.
11. **`@hookform/resolvers` 5.9.x** en lugar de 6.0.0: la 6.0.0 (publicada el 2026-10-19) tiene un conflicto de *peers* opcionales (`effect`), y no se usa `--legacy-peer-deps`.
12. **Paquete `cn`** (de shadcn, repo `shadcn-ui/cn`) que el CLI actual instala en lugar de `clsx` + `tailwind-merge`. Se verificó su origen antes de aceptarlo.
13. **No se instaló `httpx2`**, aunque Starlette 1.x lo sugiere: no se pidió y no se verificó; el aviso se filtra en pytest (sección 11).
14. **`frontend/AGENTS.md` se versiona:** `next dev` lo regenera, y versionarlo mantiene limpio el árbol de trabajo.
15. **Sin `.gitignore` propio en `frontend/`:** el generado ignoraba `.env*` (incluido `.env.example`); el de la raíz ya cubre todo.
16. **Commits sin la línea `Co-Authored-By`** ni otra atribución automática (sección 8, instrucción del responsable).

**Pendiente del responsable**

- Escribir la contraseña real de PostgreSQL en `DB_PASSWORD` (`backend/.env`) y ejecutar `bash scripts/create-databases.sh`. Con eso, la prueba de salud con base de datos deja de saltarse y `/api/v1/health` responde `ok`.
- Llenar los créditos del README y el titular de `LICENSE`.

### 2026-10-25 — Etapa 2: Base de datos

**Qué se hizo**

- **Conexión y bases:** la contraseña real ya está en `backend/.env` (el pendiente de la etapa 1 quedó resuelto). Se corrigió `scripts/create-databases.sh`: fallaba con `error de sintaxis en o cerca de «:»` porque psql no interpola variables (`:'name'`) en SQL pasado con `-c`. Ahora envía el SQL por stdin con `--set`, valida el nombre de la base, crea con `ENCODING 'UTF8' TEMPLATE template0`, y fija `PGCLIENTENCODING=UTF8` y `OUTPUT_CHARSET=UTF-8` para que los mensajes de PostgreSQL ya no aparezcan como `Â«` en Git Bash. Se probó en Git Bash (Windows 11); en Linux no se ejecutó, pero solo usa Bash, `mktemp`, `tr` y opciones estándar de psql. Ya no crea extensiones.
- **Modelos ORM** (13 tablas, un archivo por entidad): `users`, `roles`, `user_roles`, `teachers`, `career_types`, `careers`, `hourly_rates`, `subjects`, `assignments`, `schedules`, `logbook_entries`, `payroll_receipts`, `payroll_receipt_lines`. Mixins de identificadores y marcas de tiempo (`db/mixins.py`), expresiones `CHECK` reutilizables (`db/checks.py`) y constantes de esquema, calendario y folio en `core/constants.py`.
- **Migración inicial** `3295e857da8d` escrita y revisada a mano: esquema `extensions` con `btree_gist` y `unaccent`, tipo `timerange`, función `normalize_name()`, funciones y triggers (`updated_at`, inmutabilidad, cierre de bitácora), secuencia del folio, tablas, `CHECK`, FK compuestas, restricciones de exclusión e índices. Ciclo `upgrade head → downgrade base → upgrade head` verificado en `nomina_docente` y, por prueba automatizada, en `nomina_docente_test`.
- **Datos semilla** en `seeds/data/*.json` (7 carreras del TESH, 2 tipos de carrera, 3 tarifas y 2 roles), validados con Pydantic y cargados por `python -m app.seeds` / `scripts/seed.sh` en una transacción. Se ejecutó dos veces en desarrollo: la segunda reporta todo "sin cambios". `scripts/migrate.sh` envuelve Alembic.
- **Repositorios:** `BaseRepository` genérico tipado (`get`, `add` con `flush`, `_find_one`) y repositorios de usuarios, roles, docentes, carreras, tipos de carrera y tarifas, con lo que necesitan la autenticación (etapa 3) y las semillas. Sin servicios ni routers de negocio.
- **Pruebas:** 159 en verde (antes 22). Las de integración migran la base de pruebas al iniciar y aíslan cada prueba en una transacción revertida; el ayudante `violates()` exige que la **base** rechace la operación con el nombre exacto de la restricción. Cubren tarifa fuera del catálogo, salida ≤ entrada, empalmes de horarios (entre asignaciones, contiguos, otros días, otros docentes) y de bitácora, recibos y correos duplicados, cierre de periodo emitido, inmutabilidad de tarifas y recibos, redondeo `ROUND_HALF_UP` en la base, febrero bisiesto, idempotencia de semillas, convención de nombres, índice en cada FK, modelos sincronizados con la migración y el ciclo de migración.
- **Documentación:** `docs/base-de-datos.md` (diagrama ER, diccionario de datos, decisiones, migraciones, semillas y revisión en DBeaver); actualizados `docs/arquitectura.md`, README principal, `backend/README.md` y `scripts/README.md`.
- **Verificación:** Ruff, formato, mypy estricto y pytest en verde; frontend `npm run check` y `npm run build` en verde; con `dev.sh`, `GET /api/v1/health` responde `{"status":"ok","database":"ok"}` directo y a través del proxy.

**Decisiones**

1. **Identificadores:** `bigint GENERATED ALWAYS AS IDENTITY` en todas las tablas y, en las entidades del docente expuestas por la API, un `public_id` UUID v4. El `sub` del JWT será `users.public_id` (sección 6).
2. **`career_types` como catálogo** (no `CHECK`) para que un tipo nuevo, como bachillerato, sea solo un dato semilla. Claves de carrera: `ICIV`, `IIND`, `IMEC`, `ISC`, `LADM`, `LBIO`, `LGAS`. Fuente: volante oficial de admisión 2024 del TESH.
3. **RN-14 sobre asignaciones activas** (índice único parcial): desactivar conserva el historial y permite reasignar con otra tarifa.
4. **`maternal_surname` opcional** en la base, porque hay personas con un solo apellido. El formulario de registro (etapa 6) decide si lo pide.
5. **Nombre de materia normalizado por la base:** columna generada `name_normalized = normalize_name(name)` (`unaccent` con diccionario explícito, declarada `IMMUTABLE`). Ningún escritor puede saltarse la normalización de RN-09.
6. **Extensiones en el esquema `extensions`**, creadas solo por la migración. `create-databases.sh` dejó de habilitar `btree_gist` (antes lo hacía; sección 3.3 actualizada).
7. **Recibo inmutable en la base:** triggers que rechazan `UPDATE`/`DELETE` en recibos y renglones, `RESTRICT` (en lugar del `CASCADE` previsto en la etapa 0) de recibos a renglones, copia del nombre y número de empleado del docente, `CHECK` del periodo exacto y del importe de cada renglón.
8. **RN-23 en la base:** trigger `trg_logbook_entries_period_locked` que cierra la bitácora de un periodo emitido, incluso al mover una sesión hacia ese periodo.
9. **RN-12 en la base:** trigger que impide cambiar el importe de una tarifa.
10. **`updated_at` por trigger** y no por el ORM, para que también cambie con SQL directo (DBeaver, cargas masivas).
11. **Minutos enteros:** `CHECK` sin segundos en horarios y sesiones; horas como columnas generadas `NUMERIC(8,2)`.
12. **Folio:** la base entrega el consecutivo (`payroll_receipts_folio_number_seq`, columna `folio_number`) y `utils/folio.py` arma el texto con el prefijo configurable; si el consecutivo supera 6 dígitos, se escribe completo (nunca se trunca).
13. **Semillas que nunca borran:** un registro que desaparece del archivo se conserva; la baja es `is_active: false`. Se identifican por llave natural (`code`, `amount`).
14. **Fecha no futura (RN-22, RN-29) y total = suma de renglones** se validan en el servicio (etapa 4): un `CHECK` con `current_date` no es válido y la suma involucra varias filas.
15. **Relación `User.teacher` con `passive_deletes="all"`:** el ORM no intenta desvincular el perfil al borrar una cuenta; decide la FK `RESTRICT`.

**Pendiente**

- Nada bloqueante. Siguen abiertas las decisiones de la sección 11 (rol de base de datos con privilegios mínimos antes de la etapa 10, biblioteca de PDF, paleta y logos).
