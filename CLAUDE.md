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

Cada regla tiene un identificador (`RN-XX`) para citarla en código, pruebas y commits cuando aporte claridad. La explicación completa de cada regla, dónde se valida (frontend, backend, base de datos) y la prueba que la demuestra está en [`docs/reglas-de-negocio.md`](docs/reglas-de-negocio.md).

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
- **RN-09 Sin duplicados.** Un docente no puede registrar dos materias con el mismo nombre. La comparación ignora mayúsculas/minúsculas, acentos y espacios repetidos. El nombre se guarda con espacios simples y mayúsculas coherentes («bases   de datos» → «Bases de Datos»; artículos y preposiciones en minúsculas, números romanos en mayúsculas, palabras con mayúsculas propias como «TIC» se respetan).
- **RN-32 Baja de materias.** Una materia que nunca se usó en una asignación se borra. Si ya se usó, no se borra: se desactiva (deja de aparecer en los selectores y se puede reactivar). Si tiene asignaciones activas, primero hay que desactivarlas o borrarlas.

### 2.4 Tarifas por hora

- **RN-10 Catálogo de tarifas.** Las tarifas por hora viven en la tabla catálogo `hourly_rates`. Los valores iniciales son **$125.00, $135.00 y $145.00 MXN**, cargados con datos semilla. Agregar una tarifa nueva es insertar un registro: no requiere cambiar código.
- **RN-11 Selector de tarifas.** El docente elige la tarifa de un selector cuyas opciones vienen de la API. El backend rechaza cualquier tarifa que no exista o esté inactiva; la base de datos lo garantiza con una llave foránea.
- **RN-12 Tarifas inmutables.** El importe de una tarifa existente no se modifica. Si cambia el tabulador, se desactiva la tarifa anterior y se crea una nueva. Así ningún cálculo histórico cambia en silencio.

### 2.5 Asignaciones

- **RN-13 Definición.** Una asignación es la unión **docente + materia + carrera + tarifa por hora**.
- **RN-14 Unicidad.** Un docente no puede tener dos asignaciones **activas** con la misma materia en la misma carrera. Una asignación desactivada conserva su historial y permite crear otra.
- **RN-15 Borrado protegido.** Una asignación con sesiones en bitácora no se puede borrar; solo se puede desactivar. Sin bitácora, se puede borrar previa confirmación (sus horarios se eliminan con ella).
- **RN-33 Tarifa congelada en la sesión.** Cada sesión de bitácora guarda la tarifa vigente de su asignación al registrarse. Cambiar la tarifa de una asignación (se permite siempre) solo afecta a las sesiones que se registren después: las ya registradas, la vista previa de su quincena y los recibos emitidos no cambian.
- **RN-34 Materia y carrera fijas con historial.** La materia o la carrera de una asignación solo se cambian si no tiene bitácora; con historial se desactiva y se crea otra.
- **RN-35 Desactivación.** Desactivar una asignación guarda hoy como su último día activo (`active_until`) y elimina sus horarios (una clase que ya no se imparte no ocupa el horario semanal ni bloquea otras). Reactivarla exige que su materia, carrera y tarifa sigan activas y que no exista otra asignación activa igual.

### 2.6 Horarios

- **RN-16 Horario semanal.** Cada asignación tiene uno o más horarios semanales: día de la semana, hora de entrada y hora de salida.
- **RN-17 Salida posterior a la entrada.** La hora de salida debe ser estrictamente posterior a la hora de entrada. Un horario no cruza la medianoche.
- **RN-18 Sin empalmes.** Un docente no puede tener horarios empalmados entre sí, aunque pertenezcan a asignaciones distintas. Los intervalos son semiabiertos `[entrada, salida)`: un horario que termina a las 11:00 y otro que empieza a las 11:00 **no** se empalman. El error dice con qué clase choca (materia, carrera, día y horas).
- **RN-36 Duración de una clase.** Un horario o una sesión dura entre `CLASS_MIN_DURATION_MINUTES` y `CLASS_MAX_DURATION_MINUTES` (configurables; 30 y 300 minutos recomendados).

### 2.7 Bitácora

- **RN-19 Sesiones impartidas.** La bitácora registra las sesiones realmente impartidas: fecha, asignación, hora de entrada, hora de salida y observaciones (opcionales).
- **RN-20 Captura por selección.** Al capturar, el docente elige de listas lo que ya existe (asignación, es decir, materia y carrera). No vuelve a escribir nada que ya esté registrado.
- **RN-21 Precarga desde el horario.** Al elegir fecha y asignación, se precargan la entrada y la salida del horario correspondiente a ese día de la semana. El docente puede ajustarlas. `GET /logbook/scheduled?date=` devuelve las clases programadas del día con sus horas y si ya están registradas.
- **RN-22 Validaciones de la sesión.** La salida debe ser posterior a la entrada (RN-17), una sesión no puede empalmarse con otra sesión del mismo docente en la misma fecha (misma semántica de RN-18) y la fecha no puede ser futura respecto a la fecha actual en `America/Mexico_City`; si la fecha es hoy, la clase ya debe haber terminado.
- **RN-23 Sesiones de periodos emitidos.** Una sesión cuya fecha cae en un periodo con recibo emitido no se puede crear, editar ni borrar (ver RN-28).
- **RN-37 Antigüedad máxima.** Solo se registran sesiones de los últimos `LOGBOOK_MAX_AGE_DAYS` días (configurable; 30 recomendado). Aplica al crear y al cambiar la fecha de una sesión; corregir las observaciones de una sesión antigua sí se permite.
- **RN-38 Asignación activa en la fecha.** Una asignación desactivada acepta sesiones con fecha hasta su último día activo, no después.
- **RN-39 Sesión fuera de horario.** Si la sesión no coincide con el horario programado (otro día u otras horas), se registra igual y la respuesta incluye una advertencia.
- **RN-40 Registro rápido.** Varias clases programadas de un mismo día se registran en una sola petición y una sola transacción: si una falla, no se registra ninguna y el error indica cuál.

### 2.8 Recibo de nómina

- **RN-24 Periodo quincenal.** Quincena 1: días 1 al 15 del mes. Quincena 2: día 16 al último día del mes (28, 29, 30 o 31 según corresponda). Estos límites son constantes con nombre en un solo módulo (sección 4.4).
- **RN-25 Cálculo automático.** El recibo se calcula a partir de la bitácora del periodo. Por cada asignación **y tarifa** (la congelada en cada sesión, RN-33): `minutos = suma de los minutos de sus sesiones`; `horas = minutos / 60`; `importe = minutos × tarifa / 60`. El **total bruto** es la suma de los importes. El docente nunca escribe montos. La vista previa y la emisión usan la misma función de cálculo.
- **RN-26 Dinero exacto.** Todo cálculo monetario usa `Decimal` en Python y `NUMERIC` en PostgreSQL. **Jamás `float`.** Los importes se redondean una sola vez, a 2 decimales con `ROUND_HALF_UP`, a nivel de renglón; el total es la suma de los renglones ya redondeados. Las horas se muestran con 2 decimales. Las reglas de redondeo viven en un solo módulo (`backend/src/app/domain/money.py`) y en la API dinero y horas viajan como cadenas decimales (`"1250.00"`), nunca como números.
- **RN-27 Contenido del recibo.** Encabezado institucional con logo, título "Recibo de Nómina", folio, periodo, datos del docente, desglose por materia y carrera (horas, tarifa, importe) y total. Se puede descargar en PDF.
- **RN-28 Vista previa y emisión.** Mientras el periodo no se emite, el docente ve una **vista previa** calculada en vivo. Al **emitir** (con confirmación), el sistema guarda una copia fija del recibo (renglones con horas, tarifa e importe) y le asigna un folio. A partir de ahí el recibo no cambia aunque cambien los catálogos, y la bitácora de ese periodo queda bloqueada (RN-23).
- **RN-29 Un recibo por periodo.** Un docente tiene a lo más un recibo emitido por periodo (año, mes, quincena). Solo se emiten periodos ya concluidos; si `PAYROLL_ISSUE_REQUIRES_CLOSED_PERIOD=false`, también el periodo en curso. Nunca periodos futuros. No se emite un recibo sin sesiones. Dos emisiones simultáneas del mismo periodo producen un solo recibo.
- **RN-30 Folio.** El folio es único, consecutivo y lo genera la base de datos (secuencia). Formato: `{PREFIJO}-{AAAA}{MM}-Q{n}-{consecutivo de 6 dígitos}`, por ejemplo `NOM-202610-Q2-000042`. El prefijo es configurable por variable de entorno. Una emisión que falla después de pedir el consecutivo deja un hueco en la numeración (propiedad de las secuencias de PostgreSQL); nunca se repite un folio.
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
| Zonas horarias | `zoneinfo` + `tzdata` (Windows no trae la base de zonas horarias) |
| Calidad | Ruff (lint + formato), mypy en modo estricto, pytest contra `nomina_docente_test` |

### 3.2 Frontend (`frontend/`)

| Pieza | Elección |
| --- | --- |
| Framework | Next.js 16 con App Router y Turbopack (`cacheComponents` y `partialPrefetching` activos, valores por defecto de la versión) |
| Runtime | Node.js 24 LTS (`frontend/.nvmrc`, `engines` en `package.json`) |
| Lenguaje | TypeScript con `strict: true`; prohibido `any` |
| Estilos | Tailwind CSS con tokens en variables CSS |
| Estilos (versión) | Tailwind CSS 4, configuración en CSS (`@theme inline` en `src/styles/globals.css`), sin `tailwind.config` |
| Componentes | Propios en `components/ui/` sobre Radix (`radix-ui`), con la base de shadcn/ui reescrita para los tokens (sección 7.7); `cmdk` (combobox), `react-day-picker` (calendario), `sonner` (notificaciones) |
| Tipografía | Public Sans (interfaz) y Source Serif 4 (títulos), autohospedadas con `next/font/local` desde `@fontsource-variable/*` |
| Animación | Framer Motion (respetando `prefers-reduced-motion`) |
| Formularios | React Hook Form + Zod |
| Datos del servidor | TanStack Query |
| Contratos de la API | Tipos generados desde el OpenAPI con openapi-typescript (`src/lib/api-types.gen.ts`, `npm run api:types`) |
| Paquetes | npm (`package-lock.json` versionado) |
| Calidad | ESLint + Prettier + Vitest (`npm test`: contraste WCAG, valores literales, lógica pura) |

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
│   ├── core/                → config (pydantic-settings), reloj, logging, middleware, excepciones, constantes
│   │   └── security/        → Argon2, JWT, política de contraseñas (+ data/), cabeceras, tamaño, CSRF, auditoría
│   ├── db/                  → motor, sesión (get_db), base declarativa con convención de nombres, mixins y CHECK reutilizables
│   ├── models/              → modelos ORM (un archivo por entidad, registrados en __init__.py)
│   ├── domain/              → reglas puras sin E/S: periodos, redondeo, cálculo de nómina, intervalos, ocurrencias,
│   │                          importe con letra
│   ├── documents/           → recibo en PDF (fpdf2) y sus fuentes (fonts/, SIL OFL); solo presenta, no calcula
│   ├── schemas/             → modelos Pydantic de entrada/salida (common.py: dinero, horas, paginación)
│   ├── repositories/        → acceso a datos (sin lógica de negocio)
│   ├── services/            → lógica de negocio (sin saber de HTTP); constraints.py traduce restricciones
│   ├── api/v1/
│   │   ├── router.py        → router raíz con el prefijo /api/v1
│   │   ├── dependencies.py  → raíz de composición + get_current_user / get_current_teacher / require_roles
│   │   ├── cookies.py       → cookies de sesión y CSRF
│   │   ├── openapi.py       → respuestas de error documentadas (business_responses desde ERROR_CATALOG)
│   │   ├── params.py        → parámetros de consulta compartidos (periodo)
│   │   └── routers/         → endpoints delgados (validan, llaman al service, responden)
│   ├── seeds/               → datos semilla: data/*.json, validación (schemas, loader) y carga idempotente (runner)
│   ├── demo/                → cuenta de demostración (solo desarrollo), cargada por los servicios
│   ├── api/export_openapi.py → exporta el OpenAPI sin levantar el servidor (tipos del frontend)
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

**Regla de dependencias:** `routers → services → repositories → models`, y `services → domain`. Nunca al revés. Nunca un router consulta la base de datos directamente.

| Capa | Puede importar | No puede |
| --- | --- | --- |
| `api/v1/routers` | `services`, `schemas`, `api/v1/dependencies`, dependencias de `core` | usar `Session`, `repositories` o `models` |
| `api/v1/dependencies.py` | `services`, `repositories`, `db.session`, `core` | contener lógica (solo construye objetos) |
| `services` | `repositories`, `schemas`, `domain`, `documents`, `core` | conocer `Request`, `Response`, `HTTPException` ni códigos HTTP |
| `documents` | `schemas`, `domain`, `core.constants` | hacer E/S o calcular importes |
| `domain` | `core.constants` | hacer E/S (base, reloj, HTTP); los routers solo usan sus objetos de valor (p. ej. `Period`) |
| `repositories` | `models`, `db` | aplicar reglas de negocio |
| `models` | `db.base` | importar cualquier capa superior |
| `schemas` | tipos y validadores | importar modelos ORM o repositorios |

Detalles:

- Los servicios lanzan **excepciones de dominio** (`core/exceptions.py`, p. ej. `NotFoundError`, `ConflictError`, `BusinessRuleError`). Un manejador central las traduce a HTTP. Los códigos estables viven en `core/codes.py` (`ErrorCode`, `WarningCode`) y `ERROR_CATALOG` asigna a cada uno su estado HTTP y un mensaje por defecto; `domain_error(code)` construye la excepción correcta.
- La fecha del negocio la da `BusinessCalendar` (`core/clock.py`), inyectado aparte del reloj de sesión; los límites configurables llegan como `BusinessPolicy` (`services/policy.py`).
- Los servicios reciben sus repositorios por inyección (dependencias de FastAPI), lo que permite probarlos con dobles.
- La transacción la controla la capa de servicio (unidad de trabajo por petición); los repositorios no hacen `commit`.
- Los schemas de Pydantic están separados de los modelos ORM. Nunca se devuelve un modelo ORM directamente.

### 4.3 Estructura del frontend (organizada por funcionalidades)

```
frontend/
├── src/
│   ├── app/                 → solo rutas y layouts de Next.js
│   ├── features/            → auth/, catalogs/, subjects/, assignments/, schedules/, logbook/, payroll/, dashboard/
│   │   │                      (+ design-system/: guía viva, solo en desarrollo)
│   │   └── <feature>/       → components/, hooks/, api/, schemas/, types/
│   ├── components/ui/       → componentes base sobre Radix (Button, Field, Combobox, DatePicker, TimeInput, DataTable…)
│   ├── components/domain/   → Money, Hours, PeriodLabel, Folio, StatusBadge
│   ├── components/layout/   → AppShell, AuthLayout, SiteHeader, PageHeader, StatusScreen, Logo, tema, providers
│   ├── lib/                 → api-client.ts, api-error.ts, api-types.gen.ts (generado), api-schemas.ts,
│   │                          query-keys.ts, query-invalidation.ts, formateadores, calendario, utils (cn),
│   │                          theme/ (script de preferencias y store), color-contrast.ts, search.ts, time-input.ts
│   ├── config/              → env.ts (públicas), server-env.ts (solo servidor), validadas con Zod; brand.ts, fonts.ts
│   ├── constants/           → textos, mensajes de error, rutas, navegación, preferencias, HTTP, localización
│   └── styles/              → brand.css (color de marca), tokens.css (valores), globals.css (mapeo a Tailwind),
│                              token-catalog.ts, motion.ts y sus pruebas
├── public/brand/            → logos oficiales (pendientes; ver docs/sistema-de-diseno.md §10)
├── e2e/                     → pruebas de punta a punta con Playwright (`npm run test:e2e`)
├── src/proxy.ts             → redirecciones según la cookie indicadora de sesión (Next.js 16: antes middleware)
├── next.config.ts           → rewrites del proxy hacia el backend y cabeceras de seguridad de las páginas
├── playwright.config.ts     → Playwright con el Edge instalado, en escritorio y a 390 px
├── components.json          → configuración de shadcn/ui
├── eslint.config.mjs  .prettierrc.json  tsconfig.json  .nvmrc
├── AGENTS.md                → reglas para agentes que `next dev` regenera; se versiona
└── .env.example
```

Reglas:

- `app/` no contiene lógica: compone componentes de `features/` y `components/`.
- La superficie pública de una feature son sus `components/` y `hooks/`: otra feature puede usarlos (el inicio usa el botón de registro rápido de `logbook`). Nunca importa su `api/`, `schemas/` ni `types/`; lo compartido sube a `components/`, `lib/` o `constants/`.
- La raíz `/` no tiene contenido: el proxy la manda al panel o a iniciar sesión. No hay páginas técnicas ni de prueba en la interfaz; `/sistema-diseno` existe solo en desarrollo y no se enlaza.
- Todo acceso a la API pasa por el cliente HTTP de `lib/` y por los módulos `features/<feature>/api/`. Los componentes nunca llaman a `fetch` directamente (ESLint lo prohíbe fuera de `lib/api-client.ts`). Cada respuesta se valida con un schema de Zod.
- Los tipos de la API **no se escriben a mano**: se generan del OpenAPI (`npm run api:types`) y cada schema de Zod se declara con `satisfies z.ZodType<…>` contra el tipo generado. Los mensajes por código de error y de advertencia son `Record` sobre los códigos generados.
- Las claves de TanStack Query están centralizadas en `lib/query-keys.ts`; `lib/query-invalidation.ts` define qué se invalida con cada tipo de cambio.
- Los schemas de Zod viven en `features/<feature>/schemas/` y sus mensajes salen de `constants/`.

### 4.4 Cero hardcodeo (aplica a todo el proyecto, siempre)

- **Tarifas por hora:** tabla catálogo `hourly_rates` con datos semilla (125, 135, 145). La asignación la referencia con llave foránea y el frontend obtiene las opciones desde la API. **No** se usa un `CHECK` con valores fijos (esta regla sustituye la idea original de un `CHECK (rate IN (125, 135, 145))`).
- **Carreras, materias y tarifas:** siempre desde la base de datos; nunca listas escritas en el frontend.
- **Configuración** (URLs, puertos, credenciales, duración del token, CORS, nombre de la institución, prefijo de folio): variables de entorno leídas por un módulo de configuración tipado (`backend/src/app/core/config.py` con pydantic-settings; `frontend/src/config/`). Si falta una variable obligatoria, la app **falla al iniciar** con un mensaje claro que nombra la variable.
- **Límites institucionales** (duración mínima y máxima de una clase, antigüedad máxima de la bitácora, si se exige que la quincena haya terminado para emitir): variables de entorno obligatorias, publicadas al frontend en `GET /catalogs/business-rules` para que no las duplique.
- **Reglas de periodo, formatos y zona horaria:** constantes con nombre en un solo módulo por app (`backend/src/app/core/constants.py`; `frontend/src/constants/`). Ejemplos: `FIRST_FORTNIGHT_LAST_DAY = 15`, `TIMEZONE = "America/Mexico_City"`, `MONEY_DECIMAL_PLACES = 2`. Nada de números mágicos repartidos por el código.
- **Textos de la interfaz y mensajes de error:** centralizados en `frontend/src/constants/`, no regados en los componentes.
- **Colores, espaciados y tipografía:** tokens de diseño en variables CSS expuestas a Tailwind (`frontend/src/styles/`). Prohibido escribir colores sueltos (`#1a2b3c`, `rgb(...)`, `bg-[#...]`) o medidas arbitrarias (`w-[37px]`) dentro de componentes: la prueba `no-literal-values.test.ts` lo impide. Una medida nueva es un token nuevo, usado como `w-(--token)`.
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
| `users` | Identidad y credenciales | `email` (único, guardado normalizado; `CHECK email = lower(btrim(email))`), `password_hash`, `is_active`, `last_login_at`, `failed_login_attempts` y `locked_until` (bloqueo, etapa 3) |
| `roles` | Catálogo de roles | `code` (único: `teacher`; `admin` cargado inactivo, reservado), `name`, `description`, `is_active` |
| `user_roles` | Relación N:M usuario–rol | `user_id`, `role_id` (PK compuesta), `created_at` |
| `teachers` | Perfil del docente (1:1) | `user_id` (único, FK), `first_names`, `paternal_surname`, `maternal_surname` (nulo permitido), `employee_number` (único, nulo permitido) |
| `career_types` | Catálogo de tipos de carrera | `code` (`engineering`, `bachelor`), `name` |
| `careers` | Catálogo de carreras | `code` (único, mayúsculas), `name` (único), `career_type_id`, `is_active` |
| `hourly_rates` | Catálogo de tarifas | `amount` `NUMERIC(10,2)` único, `CHECK (amount > 0)`, inmutable por trigger, `is_active` |
| `subjects` | Materias del docente | `teacher_id`, `name`, `code` (opcional), `name_normalized` (columna generada con `normalize_name()` = `unaccent` + minúsculas + espacios simples); único `(teacher_id, name_normalized)`; `is_active` (baja lógica, RN-32) |
| `assignments` | Docente + materia + carrera + tarifa | `teacher_id`, `subject_id`, `career_id`, `hourly_rate_id`, `is_active`, `active_until` (último día activo; `CHECK is_active = (active_until IS NULL)`); único parcial `(teacher_id, subject_id, career_id) WHERE is_active` |
| `schedules` | Horario semanal | `assignment_id`, `teacher_id`, `weekday` (1 = lunes … 7 = domingo, ISO 8601), `start_time`, `end_time` |
| `logbook_entries` | Sesiones impartidas | `assignment_id`, `teacher_id`, `session_date`, `start_time`, `end_time`, `notes`, `hourly_rate_id` (tarifa congelada al registrar, RN-33) |
| `payroll_receipts` | Recibo emitido (copia fija) | `teacher_id`, `folio_number` (secuencia de la base), `folio` (único), `year`, `month`, `fortnight`, `period_start`, `period_end`, `teacher_full_name` y `teacher_employee_number` (copias), `total_minutes`, `total_hours` (generada), `total_amount` `NUMERIC(12,2)`, `issued_at`; único `(teacher_id, year, month, fortnight)` |
| `payroll_receipt_lines` | Renglones congelados del recibo | `receipt_id`, `teacher_id`, `assignment_id`, `subject_name`, `career_name`, `minutes`, `hours` (generada), `hourly_rate`, `amount`; único `(receipt_id, assignment_id, hourly_rate)` |
| `auth_sessions` | Sesión iniciada (etapa 3) | `public_id` (= `sid` del JWT), `user_id`, `user_agent`, `ip_address`, `last_used_at`, `expires_at`, `revoked_at`, `revocation_reason` |
| `refresh_tokens` | Refresh tokens (etapa 3) | `session_id`, `token_hash` (SHA-256, único), `expires_at`, `used_at`; un solo token sin usar por sesión |

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
- **Lo que valida solo el servicio:** fecha de sesión no futura (RN-22), antigüedad máxima (RN-37) y periodo no futuro (RN-29), porque un `CHECK` con `current_date` no es válido; duración de la clase (RN-36, límites configurables); total del recibo = suma de renglones (involucra varias filas). Toda violación de una restricción de la base se traduce al mismo código de dominio que daría el servicio (`services/constraints.py`), nunca a un 500.
- Nombres de restricciones e índices según la convención de `db/base.py` (`pk_`, `fk_`, `uq_`, `ck_`, `ex_`, `ix_`, y `trg_` para triggers); una prueba lo verifica.

---

## 6. Seguridad

Implementada en la etapa 3. Diagramas de cada flujo, amenazas y mitigaciones (OWASP Top 10) y limitaciones: [`docs/seguridad.md`](docs/seguridad.md).

### 6.1 Flujo de autenticación

1. **Registro** (`POST /api/v1/auth/register`): en **una** transacción crea `users` (correo normalizado, hash Argon2id), el rol `teacher` (buscado por su clave `RoleCode.TEACHER`, nunca por id), `teachers` y la primera sesión. Correo o número de empleado repetidos responden 409 con mensaje claro (también si la carrera la gana otro registro: la base decide con su `UNIQUE`).
2. **Inicio de sesión** (`POST /auth/login`): mismo error genérico `INVALID_CREDENTIALS` ("Correo o contraseña incorrectos.") para correo inexistente, contraseña incorrecta, cuenta bloqueada o desactivada; siempre se calcula un Argon2 (hash ficticio si no hay cuenta) para que el tiempo no revele nada. Tras `LOGIN_MAX_FAILED_ATTEMPTS` fallos seguidos, `users.locked_until = ahora + LOGIN_LOCKOUT_MINUTES`. Durante el bloqueo, solo quien escribe la contraseña **correcta** recibe `ACCOUNT_LOCKED` con `details.retry_after_seconds` (saberla ya prueba que la cuenta existe; no permite enumerar) y la pantalla muestra el tiempo restante; una contraseña incorrecta recibe el error genérico y no cuenta. Rehash transparente si el hash tiene parámetros antiguos. Actualiza `last_login_at`.
3. **Sesión:** JWT de acceso (`ACCESS_TOKEN_EXPIRE_MINUTES`, 15) con `sub` = `users.public_id` y `sid` = `auth_sessions.public_id`, más `iss`, `aud`, `typ` y `exp` obligatorios; solo algoritmos HMAC. **Cada petición comprueba en la base que la sesión `sid` siga vigente**: revocar una sesión corta el acceso de inmediato.
4. **Refresh token** opaco (256 bits) de `REFRESH_TOKEN_EXPIRE_DAYS` (7), guardado solo como SHA-256 en `refresh_tokens`; se **rota** en cada uso (`POST /auth/refresh`). Si se presenta uno ya rotado fuera de `REFRESH_TOKEN_REUSE_GRACE_SECONDS`, se **revocan todas las sesiones del usuario** (detección de reuso). Dentro de la tolerancia responde 409 `SESSION_REFRESH_CONFLICT` sin revocar (carrera entre pestañas).
5. **Cierre:** `POST /auth/logout` (sesión actual, idempotente), `POST /auth/logout-all` (todas). `POST /auth/change-password` exige la actual (un error cuenta para el bloqueo), aplica la política y revoca las **demás** sesiones.
6. **Cuenta:** `GET /auth/me` y `PATCH /auth/me` (nombres, apellidos y número de empleado; el correo no cambia).

### 6.2 Cookies

| Cookie | HttpOnly | Path | Vida |
| --- | --- | --- | --- |
| `ACCESS_COOKIE_NAME` (JWT) | sí | `/` | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| `REFRESH_COOKIE_NAME` (opaco) | sí | `/api/v1/auth` | `REFRESH_TOKEN_EXPIRE_DAYS` |
| `SESSION_HINT_COOKIE_NAME` (`1`, no es credencial) | sí | `/` | igual que el refresh |
| `CSRF_COOKIE_NAME` | **no** | `/` | igual que el refresh |

Todas con `SameSite` (`AUTH_COOKIE_SAMESITE`: `lax` o `strict`) y `Secure` (`AUTH_COOKIE_SECURE`, obligatorio en producción). La indicadora solo sirve al proxy de Next.js para redirigir.

### 6.3 CSRF

*Double-submit* en `CsrfMiddleware` para **todo** `POST`, `PUT`, `PATCH` y `DELETE`, incluidos login y registro (evita el *login CSRF*): el encabezado `X-CSRF-Token` debe ser igual a la cookie CSRF (comparación en tiempo constante) y, si llega `Origin`, debe estar en `CORS_ORIGINS`. El token se obtiene con `GET /auth/csrf` (el cliente HTTP lo pide solo) y se renueva al iniciar y al cerrar sesión.

### 6.4 Reglas de acceso (obligatorias para toda ruta futura)

- Toda ruta de negocio declara `CurrentTeacher` (o `CurrentUser`, o `require_roles(...)`) de `api/v1/dependencies.py` y pasa ese objeto al servicio.
- **Un docente solo puede acceder a sus propios datos (RN-04).** Ninguna ruta recibe el identificador del docente desde la petición; el servicio y el repositorio filtran por el docente autenticado. Un recurso de otro docente responde **404**.
- La API expone `public_id` (UUID), nunca el `id` secuencial.
- 401 = sin sesión o sesión vencida/revocada; 403 = sin permiso, sin perfil de docente o sin token CSRF.

### 6.5 Contraseñas

Política única en `core/security/password_policy.py`, publicada en `GET /auth/password-policy` (el frontend no la duplica): `PASSWORD_MIN_LENGTH` (12), máximo 128, al menos una letra y un número, sin nombre, apellidos ni parte local del correo, fuera de la lista de comunes (`core/security/data/common-passwords.txt`, ampliable sin tocar código) y, al cambiarla, distinta de la actual. Nunca se recortan, registran ni devuelven.

### 6.6 Endurecimiento

- Cabeceras: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP/CORP, `Cache-Control: no-store`, CSP `default-src 'none'; frame-ancestors 'none'` (relajada solo para `/docs`), HSTS en producción. Las páginas de Next.js también envían cabeceras básicas (`config/security-headers.ts`).
- Límite de cuerpo `MAX_REQUEST_BODY_BYTES` (413), también sin `Content-Length`.
- Pydantic estricto (`extra="forbid"`); errores en español con el formato único, sin trazas, SQL ni el valor recibido.
- OpenAPI solo fuera de producción.
- Eventos de seguridad en el logger `app.security` (registro, inicio correcto o fallido, bloqueo, reuso, cambio de contraseña, cierres) sin contraseñas, tokens ni correo en claro (se usa una huella SHA-256 truncada).

### 6.7 Secretos

Solo en `.env` (ignorado por git). `JWT_SECRET` es obligatorio y de al menos 32 caracteres; si no, el backend no inicia. Revisión de seguridad formal en la etapa 10.

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

- Paleta basada en los colores institucionales del TESH cuando lleguen los logos (etapa 11).
- Mientras tanto (etapa 5): neutros fríos y **azul marino provisional**, cuya escala vive solo en `frontend/src/styles/brand.css`. Cambiarla es reemplazar esos 11 pasos y correr `npm test`.
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

### 7.7 Sistema de diseño (etapa 5) — reglas para las etapas siguientes

Referencia completa: [`docs/sistema-de-diseno.md`](docs/sistema-de-diseno.md). Guía viva: <http://localhost:3000/sistema-diseno> (solo desarrollo).

- **Solo tokens semánticos** en componentes: `canvas`, `surface`, `surface-raised`, `surface-sunken`, `line`, `line-strong`, `fg`, `fg-muted`, `primary`, `on-primary`, `primary-soft`, `primary-ink`, `focus` y, por estado, `success|warning|danger|info` con `-soft`, `-ink`, `-line` y `on-*`. Los primitivos (`--brand-*`, `--neutral-*`…) no se usan fuera de `tokens.css`. Las escalas por defecto de Tailwind (colores, `text-sm`, `shadow-xl`, `rounded-2xl`, desenfoques) están eliminadas.
- **Escala tipográfica semántica:** `text-display`, `text-title` (con `font-serif`, solo el `h1`), `text-subtitle`, `text-body`, `text-label`, `text-small`, `text-overline` (con `uppercase`), `text-figure`. Toda cifra comparable lleva `figures`; montos con `Money`, horas con `Hours`, quincenas con `PeriodLabel`, estados con `StatusBadge`.
- **Iconos y bordes de estado** usan `*-ink`; los sólidos (`danger`…) solo son fondo de botón.
- **Formularios:** cada campo dentro de `Field` (o `FormField` con React Hook Form); datos existentes con `Select` o `Combobox`; fechas con `DatePicker` (`disableFuture` donde aplique); horas con `TimeInput`/`TimeRangeInput`; obligatorios con `*` y `FormRequiredNote`; error general en `Alert tone="danger" announce`; envío con `Button loading`.
- **Páginas del panel:** dentro del `AppShell` (lo pone `app/panel/layout.tsx`), con un `PageHeader`. Una sección nueva se agrega a `constants/navigation.ts` al construirse (la navegación solo lista lo que existe; `isAvailableRoute()` para enlazarla desde otras pantallas). Listados con `DataTable` (cifras `align: "end"`, `EmptyState` útil). Toda acción destructiva o irreversible pasa por `ConfirmDialog` con `consequences`.
- **Movimiento (etapa 9):** usar `DURATIONS` y `EASINGS` de `styles/motion.ts` o `duration-(--duration-*)`, siempre respetando `prefers-reduced-motion`.
- **Verificación:** `npm run check` incluye `npm test`; un par de colores que no cumpla AA o un valor literal hace fallar la verificación.
- **Estados de cada pantalla (etapa 6):** *skeleton* con la forma del contenido, error con «Intentar de nuevo», vacío que explica y propone, `metadata.title` propio y, si muestra datos en caché del navegador, `useHydrated()` (`lib/use-hydrated.ts`) para que el HTML del servidor y el primer render coincidan. Contraseñas con `PasswordInput`; campos opcionales con `Field optional`.
- **Cerrar sesión** navega con `window.location` (no con el router): Next.js conserva ocultas las páginas visitadas y no debe quedar nada del docente en memoria.

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

Etapa 4: `PAYROLL_ISSUE_REQUIRES_CLOSED_PERIOD`, `CLASS_MIN_DURATION_MINUTES`, `CLASS_MAX_DURATION_MINUTES` y `LOGBOOK_MAX_AGE_DAYS` (backend).

Etapa 5: `DESIGN_GUIDE_ENABLED` (frontend, solo servidor): publica la guía viva; en un build de producción responde 404 aunque valga `true`.

Variables que deben coincidir entre apps: `CSRF_COOKIE_NAME` (backend) = `NEXT_PUBLIC_CSRF_COOKIE_NAME` (frontend); `SESSION_HINT_COOKIE_NAME` (backend) = `SESSION_HINT_COOKIE_NAME` (frontend, solo servidor); `API_HOST`/`API_PORT` (backend) ↔ `API_PROXY_TARGET` (frontend); `DEV_SERVER_PORT` (frontend) debe estar en `CORS_ORIGINS` (backend).

### 9.5 Comandos habituales

| Tarea | Comando (desde la raíz) |
| --- | --- |
| Preparar entorno | `bash scripts/setup.sh` |
| Crear bases de datos | `bash scripts/create-databases.sh` |
| Aplicar migraciones | `bash scripts/migrate.sh` (con argumentos: `current`, `downgrade base`…) |
| Cargar datos semilla | `bash scripts/seed.sh` |
| Cargar datos de demostración (solo desarrollo) | `bash scripts/demo-data.sh` → `docente.demo@example.com` / `Pizarron-Verde-2026` |
| Regenerar los tipos de la API del frontend | `bash scripts/generate-api-types.sh` (o `npm run api:types`; `--check` / `npm run api:check` para verificar) |
| Levantar todo | `bash scripts/dev.sh` |
| Verificar backend | `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest` |
| Verificar frontend | `cd frontend && npm run check && npm run api:check && npm run build` (`check` = lint + tipos + formato + `npm test`) |
| Guía viva del sistema de diseño | `bash scripts/dev.sh` → http://localhost:3000/sistema-diseno |
| Pruebas de punta a punta | con `dev.sh` en marcha: `cd frontend && npm run test:e2e` (Edge instalado; cuentas `@e2e.example.com`) |

---

## 10. Hoja de ruta

- [x] **0. Cimientos y CLAUDE.md**
- [x] **1. Arquitectura base del backend y frontend** (proyectos inicializados y conectados)
- [x] **2. Base de datos:** modelos, migraciones y catálogo de carreras
- [x] **3. Autenticación:** registro, login, sesión y seguridad
- [x] **4. Lógica de negocio:** materias, asignaciones, horarios, bitácora y cálculo de nómina
- [x] **5. Sistema de diseño** (colores, tipografía, componentes)
- [x] **6. Pantallas:** login, registro, panel principal y perfil
- [x] **7. Pantallas:** materias, clases (asignaciones), horario y bitácora
- [x] **8. Recibo de nómina y exportación a PDF**
- [ ] **9. Animaciones y microinteracciones**
- [ ] **10. Pruebas, QA y revisión de seguridad**
- [ ] **11. Logos, pulido final y documentación**

### Mejoras futuras (fuera de alcance de esta versión)

- Cálculo de ISR, IMSS y otras deducciones.
- Recuperación de contraseña por correo, segundo factor (MFA) y pantalla de sesiones activas (ver `docs/seguridad.md` §8).
- Rol de administrador (gestión de catálogos, consulta de docentes).
- Cancelación o reexpedición de recibos emitidos.
- Tarifa vigente por fecha (versionar la asignación) si la institución necesita registrar sesiones atrasadas con una tarifa anterior (ver `docs/base-de-datos.md` §3.9).
- Historial de horarios (hoy las advertencias de «clases sin registrar» usan el horario actual).
- Catálogo de días inhábiles para no contar como pendientes las clases de días festivos.
- Despliegue en servidor institucional.

---

## 11. Decisiones pendientes

| Tema | Etapa | Opciones / criterio |
| --- | --- | --- |
| Paleta institucional | 11 | La paleta provisional (azul marino) y la tipografía quedaron en la etapa 5. Al llegar los logos: reemplazar la escala de `styles/brand.css`, declarar los archivos en `config/brand.ts` y correr `npm test` (docs/sistema-de-diseno.md §10) |
| CSP de las páginas y script de tema | 10 | El script de preferencias es un `<script>` en línea en `<head>`; la CSP con *nonces* de la etapa 10 debe incluirlo (o pasar a un *hash* fijo) |
| Cuentas de las pruebas e2e | 10 | `npm run test:e2e` deja cuentas `@e2e.example.com` en la base de desarrollo. Evaluar un comando de limpieza o una base dedicada para e2e |
| Usuario de base de datos de la app | 2 | Hoy se usa `postgres` en desarrollo local. Evaluar un rol propio con privilegios mínimos (dueño de las bases) antes de la revisión de seguridad de la etapa 10 |
| Huecos en el consecutivo del folio | 10 | Una emisión revertida después de `nextval` deja un hueco. Si la institución exige numeración sin huecos, usar una tabla contador bloqueada dentro de la misma transacción |
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

### 2026-10-25 — Etapa 3: Autenticación, registro, sesión y seguridad

**Qué se hizo**

- **Backend, capa de servicios por primera vez:** `AuthService` (registro, inicio de sesión, renovación, cierre), `AccountService` (perfil, cambio de contraseña), `SessionManager` (emisión, validación, rotación, revocación) y `LoginThrottle` (bloqueo). El servicio controla la transacción con `UnitOfWork`; los repositorios traducen violaciones de restricciones a `ConstraintViolationError`.
- **Piezas de seguridad** en `core/security/`: Argon2id con rehash y hash ficticio, JWT ligado a la sesión, tokens opacos con SHA-256, política de contraseñas con lista en archivo de datos, middlewares de cabeceras, límite de tamaño y CSRF, y auditoría. Reloj inyectable (`core/clock.py`) para probar bloqueos y vencimientos.
- **API** `/api/v1/auth`: `csrf`, `password-policy`, `register`, `login`, `refresh`, `logout`, `logout-all`, `me` (GET y PATCH) y `change-password`, documentados en OpenAPI en español con ejemplos y errores. Dependencias `get_current_user`, `get_current_teacher` y `require_roles(...)`.
- **Esquema:** migración `067cd1ed562c` (tablas `auth_sessions` y `refresh_tokens`, columnas `failed_login_attempts` y `locked_until` en `users`), revisada a mano, con trigger y downgrade; ciclo `upgrade → downgrade -1 → upgrade` verificado en desarrollo.
- **Configuración:** variables nuevas (vida de tokens, tolerancia de reuso, nombres y atributos de cookies, intentos y bloqueo, longitud mínima, tamaño máximo), todas obligatorias y documentadas en `backend/.env.example` con valores seguros. `AUTH_COOKIE_NAME` se sustituyó por `ACCESS_COOKIE_NAME`, `REFRESH_COOKIE_NAME` y `SESSION_HINT_COOKIE_NAME`; `ACCESS_TOKEN_EXPIRE_MINUTES` bajó de 480 a 15. Se actualizaron `backend/.env` y `frontend/.env.local` locales.
- **Frontend:** cliente HTTP con token CSRF automático y renovación de sesión única ante 401 (compartida entre peticiones simultáneas); feature `auth` (api, schemas, hooks, components, types); `src/proxy.ts`; páginas `/iniciar-sesion`, `/registro` y `/panel` provisional; componentes `input` y `label` de shadcn/ui; cabeceras de seguridad de las páginas.
- **Pruebas:** 283 en verde (antes 159). Prueba de punta a punta en dos niveles, con datos ficticios que se borraron al terminar: (1) `curl` contra el proxy de Next.js (atributos de cookies, redirecciones, renovación, CSRF ausente, cabeceras) y (2) navegador real (Microsoft Edge sin interfaz, con `playwright-core` instalado fuera del repositorio): registro con validación en vivo → panel → renovación automática al vencer el token de acceso → cerrar sesión → contraseña incorrecta (mensaje genérico) → iniciar sesión → sesión irrecuperable vuelve a iniciar sesión → correo duplicado marcado en su campo. 18 de 18 comprobaciones correctas.
- **Documentación:** `docs/seguridad.md` (diagramas de secuencia, OWASP Top 10, configuración, limitaciones); actualizados `docs/base-de-datos.md`, `docs/arquitectura.md`, README y `backend/README.md`.

**Decisiones**

1. **JWT revocable:** el token de acceso lleva `sid` y cada petición verifica la sesión en la base (una lectura por llave única). Cuesta una consulta, pero `logout`, `logout-all`, el cambio de contraseña y la detección de reuso surten efecto al instante en lugar de esperar 15 minutos.
2. **Reuso del refresh token revoca todas las sesiones del usuario**, no solo la familia: no se sabe cuál copia es la legítima y la víctima recupera el acceso con su contraseña.
3. **Tolerancia de reuso entre pestañas** (`REFRESH_TOKEN_REUSE_GRACE_SECONDS`, 10 s) con 409 `SESSION_REFRESH_CONFLICT`, que el cliente trata como éxito; la fila del token se bloquea con `FOR UPDATE`.
4. **Cookie indicadora de sesión** (`SESSION_HINT_COOKIE_NAME`, valor `1`, `HttpOnly`) para el proxy de Next.js, porque la de refresh tiene ruta restringida y la de acceso dura 15 minutos. No es credencial.
5. **Next.js 16 usa `proxy.ts`** (antes `middleware.ts`); su `matcher` debe ser literal, así que repite las rutas de `constants/routes.ts` con un comentario que lo explica.
6. **CSRF también en login y registro**, más validación de `Origin` contra `CORS_ORIGINS`; el middleware corre antes del enrutamiento, así que un `POST` sin token recibe 403 aun en rutas inexistentes (se niega por defecto).
7. **Cuenta bloqueada responde el mismo error genérico**, para no permitir enumerar cuentas; el texto del frontend avisa del bloqueo temporal.
8. **Un error en la contraseña actual al cambiarla cuenta para el bloqueo:** una sesión robada no sirve para adivinarla.
9. **Política de contraseñas publicada por la API**; el frontend arma sus validaciones con ella. La lista de contraseñas comunes no se publica.
10. **Del correo solo cuenta la parte local** como dato personal: el dominio (`tesh.edu.mx`) es de todos.
11. **Variables obligatorias sin valores por defecto en el código** (sección 9.4); los valores seguros recomendados viven en `.env.example`. `Settings` rechaza `Secure=false` en producción, `SameSite=none`, algoritmos no HMAC y nombres de cookie repetidos.
12. **Validación de la IP del cliente** antes de guardarla (`inet`) y *user agent* recortado: una prueba encontró que un host no IP provocaba un 500.
13. **`S105` de Ruff ignorado solo** en `constants.py`, `exceptions.py` y `audit.py`: marca nombres con «password»/«token» que son códigos, no secretos.
14. **`pydantic[email]`** (email-validator) para validar la forma del correo sin consultar DNS.
15. **Mensajes de validación en español** en el manejador central, sin incluir nunca el valor recibido; los 404/405 de Starlette también se responden en español.

**Pendiente**

- Nada bloqueante. Siguen abiertas las decisiones de la sección 11 y las mejoras listadas en `docs/seguridad.md` §8 (recuperación de contraseña por correo, limitador por IP, CSP con *nonces* en las páginas para la etapa 10).

### 2026-10-25 — Etapa 4: Lógica de negocio

**Qué se hizo**

- **Dominio puro** (`backend/src/app/domain/`): periodos quincenales (`Period`: fechas exactas, quincena de una fecha, las 24 del año, etiquetas en español), reglas de redondeo en un solo módulo (`money.py`), cálculo del recibo por asignación y tarifa (`payroll.py`), intervalos semiabiertos y duración de clases (`time_ranges.py`), ocurrencias del horario contra la bitácora (`attendance.py`) y formato de nombres de materia (`subjects.py`).
- **Catálogo de códigos** (`core/codes.py`: `ErrorCode` con 51 códigos y `WarningCode` con 6) y `ERROR_CATALOG` con estado HTTP y mensaje por defecto; `domain_error()`; los códigos se publican como enumeraciones en el OpenAPI.
- **Migración `8c41d2f7a9b3`** (revisada a mano, ciclo `upgrade → downgrade -1 → upgrade` verificado): `subjects.is_active`, `assignments.active_until` con su `CHECK`, `logbook_entries.hourly_rate_id` (rellenada con los triggers de bitácora desactivados) y renglones del recibo únicos por asignación y tarifa.
- **Servicios y API** (32 rutas en total): catálogos de solo lectura y reglas configurables; CRUD de materias con búsqueda sin acentos y baja lógica; asignaciones (crear, editar, cambiar tarifa, desactivar, reactivar, borrar); horarios con detección de empalmes que nombra la clase con la que choca y horario semanal agrupado por día; bitácora (registro, edición, borrado, listado filtrable con totales, clases programadas de una fecha y registro rápido todo o nada); nómina (quincenas del año con estado, vista previa con advertencias y bloqueos, emisión con folio, listado y detalle de recibos); resumen del panel. Paginación y filtros con un solo formato; dinero y horas como cadenas decimales; horas `HH:MM`.
- **Datos de demostración**: `scripts/demo-data.sh` (`python -m app.demo`) carga por los servicios una cuenta ficticia (`docente.demo@example.com`) con 6 materias, 7 asignaciones en 4 carreras y 3 tarifas, 11 horarios, bitácora de 4 quincenas (78 sesiones al 25 de octubre de 2026), un cambio de tarifa y 2 recibos emitidos. Idempotente; se niega a correr fuera de `APP_ENV=development`.
- **Frontend (capa de datos, sin pantallas)**: tipos generados con openapi-typescript 7.13.0 (`scripts/generate-api-types.sh`, `npm run api:types`, `npm run api:check`); features `catalogs`, `subjects`, `assignments`, `schedules`, `logbook`, `payroll` y `dashboard` con `api/`, `hooks/` (TanStack Query), `schemas/` (Zod con `satisfies` contra los tipos generados) y `types/`; claves de consulta centralizadas e invalidación por tipo de cambio; formateadores de moneda, horas, fechas y periodos sobre cadenas decimales; mensajes por código de error (con detalle: clase con la que choca, límites, folio) y de advertencia.
- **Pruebas**: 530 en verde (antes 283). Unitarias del dominio (todas las quincenas de un año, febrero normal y bisiesto incluido 2000 y 2100, meses de 30 y 31 días, días 15 y 16, clases de 50 y 90 minutos, medio centavo, sumas sin pérdida, 10 000 horas). Integración de cada endpoint con su código de dominio; aislamiento entre docentes en todos los recursos (lectura, edición, borrado, cambio de estado y uso de recursos ajenos: 404); empalmes de horarios y de bitácora; periodos bloqueados; cambio de tarifa sin afectar el historial; emisión idéntica a la vista previa, folio consecutivo, periodo duplicado, futuro o sin sesiones; **dos emisiones simultáneas con conexiones reales producen un solo recibo**; cada restricción traducida existe en el esquema; carga de demostración coherente e idempotente.
- **Verificación con el servidor real**: con los datos de demostración, `/docs` responde y `GET /dashboard/summary`, `/payroll/preview` y `/payroll/receipts` devuelven cifras coherentes (por ejemplo, la 1.ª quincena de octubre: 39.00 h y $5,221.67 MXN, cuadrando renglón por renglón a mano).
- **Documentación**: `docs/reglas-de-negocio.md` (cada RN con dónde se valida y su prueba, fórmula con ejemplo numérico, diagramas de la emisión, de la concurrencia y del ciclo de vida de una sesión), `docs/api.md` (convenciones, tabla de endpoints y catálogo de códigos, generados del OpenAPI y de `ERROR_CATALOG`); actualizados `docs/arquitectura.md`, `docs/base-de-datos.md`, los README y este archivo.

**Decisiones**

1. **Tarifa congelada en cada sesión** (`logbook_entries.hourly_rate_id`) en lugar de versionar la asignación o de obligar a desactivar y crear otra: una columna, la FK garantiza que sea del catálogo y la inmutabilidad del importe (RN-12) congela el precio. Cambiar la tarifa de una asignación ya se permite y no altera historial. Comparación de opciones en `docs/base-de-datos.md` §3.9.
2. **Renglón del recibo por asignación y tarifa**: un cambio de tarifa dentro de la quincena produce dos renglones (advertencia `ASSIGNMENT_RATE_CHANGED`).
3. **Capa `domain/` pura** (nueva en la arquitectura): las reglas que más deben probarse (periodos, redondeo, cálculo) no dependen de la base; la vista previa y la emisión llaman a la misma función, por eso coinciden.
4. **Calendario del negocio separado del reloj de sesión** (`BusinessCalendar`): PyJWT valida la expiración con la hora real, así que mover el reloj de sesión invalidaría las cookies. La zona horaria sigue siendo una constante (decisión 8 de la etapa 0).
5. **Límites institucionales como variables de entorno** (duración de clases 30–300 min, antigüedad de la bitácora 30 días, emisión solo de quincenas terminadas), publicados en `GET /catalogs/business-rules` para que el frontend no los duplique. Los días de quincena siguen siendo constantes (reglas de la nómina, no del despliegue).
6. **Emisión solo de quincenas terminadas por defecto** (`PAYROLL_ISSUE_REQUIRES_CLOSED_PERIOD=true`): RN-29 permitía emitir la quincena en curso; ahora es configurable y el valor recomendado lo impide, porque un recibo emitido a medias bloquea el resto de la bitácora de la quincena.
7. **Concurrencia por bloqueo de la fila del docente** (`SELECT … FOR NO KEY UPDATE`) en la emisión y en toda escritura de bitácora: dos emisiones del mismo periodo se serializan y una sesión que llega durante la emisión queda rechazada por el cierre. No bloquea lecturas ni las inserciones con llave foránea al docente. El `UNIQUE` del periodo y el trigger de cierre respaldan la regla en la base.
8. **Catálogos por llave natural en la API** (carrera por `code`, tarifa por `amount` como cadena): no se expone ningún `id` secuencial y la llave es estable e inmutable.
9. **Sesión de hoy solo si ya terminó** (`SESSION_NOT_FINISHED`): no se certifica una clase que no ha ocurrido.
10. **Antigüedad máxima al crear o mover la fecha**, no al corregir observaciones: permite arreglar una nota sin reabrir la ventana de captura.
11. **Desactivar una asignación borra sus horarios**: los horarios no tienen valor histórico y, si se quedaran, bloquearían por empalme la clase que la sustituye. La bitácora y los recibos se conservan.
12. **Materia: borrar si nunca se usó, desactivar si tiene historial, 409 si tiene asignaciones activas** (`DELETE /subjects/{id}` responde `outcome`).
13. **Advertencias, no errores, para sesiones fuera de horario** (RN-39): una clase recorrida es real y debe pagarse; se avisa para revisar.
14. **«Clases sin registrar» con el horario actual** y sin calendario de días inhábiles: es una advertencia, no un bloqueo. Ambas mejoras quedan en la hoja de ruta.
15. **Tipos del frontend generados del OpenAPI** y vinculados a Zod con `satisfies`; los textos por código son `Record` sobre los códigos generados, así que un código nuevo sin texto no compila.
16. **Datos de demostración por los servicios**, con un reloj que viaja a cada fecha: los datos cumplen todas las reglas y sirven además como prueba de punta a punta del dominio.
17. **Pruebas de negocio con Argon2 de parámetros mínimos**: registran docentes en cada caso; el hash real lo cubren las pruebas de autenticación.
18. **Finales de línea:** las ediciones con `Path.write_text` en Windows guardaron CRLF; se normalizó todo a LF en un commit propio y los scripts de edición escriben con `newline="\n"`.

**Pendiente**

- Nada bloqueante. Abiertas: decisiones de la sección 11 (incluida la de huecos en el folio, nueva) y las pantallas (etapas 6 a 8). Swagger (`/docs`) no envía el encabezado CSRF por su cuenta: para probar escrituras se usa `curl` o el frontend (README, «Probar la API en `/docs`»).

### 2026-10-25 — Etapa 5: Sistema de diseño

**Qué se hizo**

- **Dirección visual** escrita primero en `docs/sistema-de-diseno.md`: documento oficial llevado a software moderno, jerarquía por tipografía y espacio, números protagonistas, color con intención y densidad media.
- **Tokens** (`frontend/src/styles/`): primitivos OKLCH en escalas completas (neutros fríos, verde, ámbar, rojo, azul verdoso y la marca en `brand.css`) y semánticos para modo claro y oscuro; escala tipográfica semántica; espaciado de composición; alturas de control; radios de 2 a 6 px; tres sombras; capas (`--layer-*`); movimiento con anulación por `prefers-reduced-motion`; puntos de quiebre. `globals.css` elimina las escalas por defecto de Tailwind (colores, tamaños de texto, sombras, radios, desenfoques, contenedores).
- **Tema claro y oscuro:** script en `<head>` que aplica la preferencia guardada antes de pintar (con almacenamiento protegido por `try/catch`), store con `useSyncExternalStore` que sigue al sistema y a otras pestañas, selector segmentado y opciones en el menú de la cuenta. La preferencia de la barra lateral se aplica igual, sin salto al hidratar.
- **Tipografías autohospedadas:** Public Sans y Source Serif 4 con `next/font/local` desde `@fontsource-variable/*`, sin descargas al compilar.
- **Componentes base** (`components/ui/`, 32 componentes): Button (6 variantes, 5 tamaños, carga sin cambio de ancho), Field/Fieldset/FormField (React Hook Form), Input, Textarea con contador, Select, Combobox con búsqueda sin acentos, Checkbox, RadioGroup, Switch, Calendar y DatePicker (es-MX, lunes, límites, `disableFuture`), TimeInput y TimeRangeInput (24 h, máscara, intervalos, lista, duración en vivo), Table, DataTable (orden, skeleton, vacío, totales, paginación del backend, tarjetas en celular), Pagination, Card, Badge, Alert, toast, Dialog, ConfirmDialog, Sheet, Popover, Tooltip, DropdownMenu, Tabs, Skeleton, Spinner, Breadcrumbs, EmptyState y StatCard.
- **Componentes del dominio** (`components/domain/`): Money, Hours, PeriodLabel, Folio y StatusBadge (estados de sesión, quincena y registro).
- **Layout** (`components/layout/`): AppShell (barra lateral contraíble y panel deslizable en celular, migas, menú de la cuenta), AuthLayout (franja institucional), SiteHeader, PageHeader, Logo (logotipo tipográfico provisional), SkipLink y selector de tema. Navegación en `constants/navigation.ts`. Las páginas existentes (iniciar sesión, registro, panel provisional y estado del sistema) migraron sin cambiar su lógica; se retiraron `app-header`, `form-field`, `form-alert` y `logout-button` de auth.
- **Guía viva** `/sistema-diseno` (feature `design-system`): principios, colores en ambos modos con contraste calculado en vivo, tipografía, fundamentos, movimiento y todos los componentes con variantes y estados, más un formulario real con React Hook Form y Zod. Solo en desarrollo (`DESIGN_GUIDE_ENABLED`; en producción, 404 verificado con `next start`).
- **Pruebas:** Vitest en el frontend (433 pruebas en 8 archivos): contraste WCAG AA de 48 pares en cada modo, gamut sRGB de cada primitivo, mapeo de tokens, sincronía de `motion.ts`, ausencia de valores literales en todo `src/`, máscara y lectura de horas, búsqueda sin acentos, orden en español, paginación, fechas en la zona de la institución y resolución de clases (`cn`). Backend sin regresiones (530).
- **Verificación en navegador** (Edge sin interfaz con `playwright-core` fuera del repositorio): sin desbordamiento horizontal a 390 px en guía, acceso y panel; el primer elemento enfocable es «Saltar al contenido»; combobox, hora, calendario, diálogo de confirmación (foco inicial en «Cancelar», Escape devuelve el foco), panel deslizable y menú de la cuenta operados solo con teclado. Capturas en ambos modos en `docs/img/`.
- **Documentación:** `docs/sistema-de-diseno.md` (dirección, paleta y tipografía justificadas, tablas de tokens, guía de uso de cada componente, accesibilidad, redacción, verificaciones y cómo reemplazar la marca); actualizados `docs/arquitectura.md`, los README y este archivo (sección 7.7).

**Decisiones**

1. **OKLCH para todos los colores**: espacio perceptual, escalas parejas y contraste predecible; cada primitivo dentro de sRGB (lo verifica una prueba) para que el navegador no lo ajuste.
2. **Azul marino provisional (tono 259)** y estados en tonos separados del primario; información en azul verdoso (232) para no confundirse con una acción.
3. **Iconos y bordes de estado con `*-ink`**: el rojo sólido en modo oscuro no alcanza 3:1 sobre superficies elevadas; los sólidos quedan solo como fondo de botón.
4. **Public Sans + Source Serif 4** en lugar de Inter/Roboto: sans de servicio público con cifras tabulares y serif de tamaño óptico solo en títulos, para el tono de documento oficial. Autohospedadas (revierte la decisión 9 de la etapa 1 sin depender de internet al compilar).
5. **Escalas por defecto de Tailwind eliminadas** y prueba de valores literales en `npm test` (no una regla de ESLint): cubre también CSS y detecta utilidades que Tailwind ignoraría en silencio.
6. **Tema con `data-theme` y script en `<head>`** en lugar de `light-dark()`: compatible con los navegadores de destino, sin parpadeo y con subárboles forzables (la guía compara modos lado a lado). La preferencia «como el sistema» es la predeterminada.
7. **Marca en un módulo TS (`config/brand.ts`) más una hoja de color (`styles/brand.css`)**: el color debe vivir en CSS para que la prueba de contraste lo lea; nombres y logos en TS. Logo declarado explícitamente (con medidas) en lugar de detectar archivos.
8. **Componentes propios sobre Radix** en lugar de los de shadcn tal cual: se reescribieron para los tokens (alturas comunes, foco con `outline`, sin `dark:` sueltos); `cmdk`, `react-day-picker` 10 y `sonner` para combobox, calendario y notificaciones.
9. **Selector de hora propio con máscara** en lugar de `<input type="time">`: el nativo cambia a 12 h según el sistema y permite valores fuera de intervalo; el propio garantiza 24 h, intervalos y nunca entrega una hora inválida. Los límites solo acotan lista y flechas; una hora escrita fuera de rango se conserva para que el formulario explique el error.
10. **Fechas por selección, sin escritura**, con `disableFuture` calculado al abrir el calendario (hoy en la Ciudad de México), para no prerenderizar con la fecha del servidor.
11. **Navegación definitiva desde ahora** con secciones `ready: false` («Pronto») hasta las etapas 6 a 8; los componentes de `components/` no importan features (`AuthenticatedShell` conecta la sesión).
12. **Obligatorios marcados con `*`** y nota al inicio del formulario; en iniciar sesión no se marcan.
13. **Guía viva solo en desarrollo** por variable de servidor y, además, nunca en un build de producción; ejemplos verosímiles en `constants/design-guide.ts`, nunca mostrados fuera de la guía.
14. **Ícono provisional** (`app/icon.svg`) con la «T» en serif; se reemplaza con el favicon oficial.

**Pendiente**

- Nada bloqueante. Logos oficiales y paleta definitiva (sección 11, etapa 11); incluir el script de tema en la CSP de la etapa 10.

### 2026-10-26 — Etapa 6: Acceso, inicio y perfil (rama `producto-01-acceso-inicio-perfil`)

**Qué se hizo**

- **Limpieza:** la raíz redirige al panel o a iniciar sesión; se retiró la página de estado del sistema (`features/system-status`) y la navegación solo muestra secciones que existen (sin «Pronto» ni textos de etapas). `.vscode/settings.json` (local, ignorado por git) oculta las carpetas generadas, y la configuración de Claude Code del responsable ya no agrega `Co-Authored-By`.
- **Iniciar sesión:** una línea que dice qué es el sistema y para quién (también en celular), autocompletado correcto, `PasswordInput` (mostrar u ocultar y aviso de Bloq Mayús), mensaje genérico, aviso de cuenta bloqueada con el tiempo restante, sin doble envío y regreso seguro a la página solicitada.
- **Registro:** campos agrupados (datos personales y de acceso), número de empleado opcional explicado, confirmación de contraseña, validación al salir de cada campo y requisitos de la política marcándose en vivo (incluido «sin datos personales», con la misma regla del backend).
- **Inicio:** saludo según la hora, fecha y quincena actual; monto estimado (indicador principal, aclarado como estimado), horas y sesiones pendientes; clases de hoy registrables en un clic (o todas a la vez); avisos con acción (emitir el recibo de una quincena terminada, con confirmación y total; registrar clases pendientes desde un diálogo); últimos recibos. Un docente sin materias, asignaciones u horarios ve una **guía de configuración** de tres pasos que se marcan con sus datos y se completan en diálogos, sin salir del inicio.
- **Mi perfil:** nombres y número de empleado editables, correo de solo lectura, último inicio de sesión, cambio de contraseña con requisitos en vivo (avisa que se cerraron las demás sesiones) y cierre de sesión en todos los dispositivos con confirmación.
- **Calidad:** *skeleton*, error con reintentar y vacíos útiles en cada pantalla; 404 y error inesperado con diseño propio (`StatusScreen`); título de pestaña por página.
- **Backend:** código `ACCOUNT_LOCKED` (con `retry_after_seconds`) y resumen del panel con `pending_sessions.items`, `unissued_periods` y `setup`.
- **Pruebas:** backend 534 en verde (Ruff, formato y mypy también); frontend 468 (Vitest, con requisitos de contraseña, guía, bloqueo y formatos nuevos); Playwright 14 de 14 (7 flujos en escritorio y a 390 px). `npm run build` en verde.

**Decisiones**

1. **El bloqueo solo se revela con la contraseña correcta.** Cumple «aviso claro con tiempo restante» sin permitir enumerar cuentas; durante el bloqueo, un error no cuenta como intento.
2. **La guía de configuración trabaja en diálogos dentro del inicio.** Las pantallas de materias, asignaciones y horarios llegan en la etapa 7; mientras, el docente nuevo puede dejar su cuenta lista sin enlaces a páginas inexistentes. Los diálogos viven en su feature y se reutilizarán.
3. **Las features exponen `components/` y `hooks/`** a otras (sección 4.3): evita duplicar el registro rápido o la emisión en el inicio.
4. **Navegación completa al cerrar sesión** (y al vencer la sesión): con `cacheComponents`, Next.js conservaba oculta la página anterior con los datos del docente; las pruebas e2e lo detectaron.
5. **Playwright como dependencia del frontend** (`@playwright/test` 1.64.1) con el Edge instalado, en lugar de un `playwright-core` fuera del repositorio: las pruebas se versionan y cualquiera las repite.
6. **Monto estimado como indicador principal** del inicio: es lo que el docente quiere saber; las horas y las pendientes lo explican.

**Pendiente**

- Etapa 7: pantallas de materias, asignaciones, horario y bitácora (se agregan a `constants/navigation.ts`). Etapa 8: recibos y PDF.

### 2026-10-27 — Etapas 7 y 8: Operación completa y recibo en PDF (rama `producto-02-operacion-nomina`)

**Qué se hizo**

- **Navegación completa:** Inicio, Mis materias, Mis clases, Horario, Bitácora, Recibos y Mi perfil (`constants/navigation.ts`). Textos de estas pantallas en `constants/screens.ts`; en la interfaz las asignaciones se llaman «clases».
- **Mis materias:** búsqueda sin acentos (servidor), filtro por estado, alta y edición en diálogo; quitar una materia la borra, la desactiva explicando por qué (tiene historial) o explica que primero hay que desactivar sus clases.
- **Mis clases:** agrupadas por carrera con tarifa, horarios y horas semanales; filtros por carrera y estado; materia con combobox y alta en el mismo formulario; carrera y tarifa solo de catálogos; al editar se explica que la tarifa no afecta lo registrado y, con bitácora, que materia y carrera no cambian; desactivar, reactivar y eliminar con confirmación.
- **Horario:** cuadrícula semanal lunes a sábado (domingo si tiene clases) con bloques a escala, lista por día en celular; alta, edición y eliminación; el empalme dice con qué clase, qué día y a qué hora.
- **Bitácora:** hoy por defecto (antigüedad máxima publicada por el servidor), clases programadas con registro en un clic o todas, registro fuera de horario con aviso previo y precarga de horas, sesiones de la quincena filtrables por quincena y clase con totales, edición y eliminación solo en periodos abiertos (las cerradas, con candado y explicación).
- **Recibos:** vista previa por quincena (renglones, totales, avisos y bloqueos), propuesta de quincenas terminadas sin recibo, emisión con confirmación que lleva al recibo, lista por año, detalle como documento oficial con importe con letra y firmas, impresión limpia (`print:`) y descarga en PDF.
- **Backend:** `domain/amount_words.py` (importe con letra), `documents/receipt_pdf.py` (PDF carta con fpdf2 y fuentes incluidas), `GET /payroll/receipts/{id}/pdf` y `total_amount_words` en el detalle.
- **Pruebas:** backend 562 en verde (Ruff, formato y mypy también); frontend 491 (Vitest); Playwright 17 (flujo completo de un docente nuevo hasta el PDF, cuenta de demostración en todas las pantallas, más los flujos de la etapa 6), en escritorio y a 390 px. `npm run build` en verde.

**Decisiones**

1. **fpdf2 para el PDF:** Python puro (sus dependencias, Pillow y fontTools, traen ruedas para Windows y Linux); WeasyPrint necesita Pango/GTK y ReportLab compila extensiones. Las fuentes viajan con el código para que el documento se vea igual en cualquier equipo.
2. **El PDF y el detalle se arman con la misma respuesta** (`ReceiptDetailResponse`): el total con letra se calcula una sola vez en el dominio.
3. **Los menús de acciones no son modales** (`DropdownMenu modal={false}`): abren diálogos y así el foco no queda atrapado al cerrarse.
4. **Avisos tras una acción con `mutateAsync`:** si el botón se desmonta al terminar (una clase que pasa a «Registrada»), los callbacks de `mutate` no se ejecutan; las pruebas e2e lo detectaron.
5. **El foco vuelve al campo de fecha** al elegir un día (`DatePicker`), también dentro de un diálogo.
6. **`FormField` admite formularios cuyo schema transforma los valores** (entrada distinta de la salida).
7. **El layout del panel va dentro de `Suspense`:** las rutas dinámicas (`/panel/recibos/[id]`) leen la ruta actual con `cacheComponents`.
8. **Los datos de demostración no cambian:** ya tienen materias, clases en cuatro carreras, horario, bitácora de cuatro quincenas y dos recibos; la 1.ª quincena de octubre queda sin emitir para probar la emisión.

**Pendiente**

- Etapa 9 (animaciones), 10 (QA y seguridad) y 11 (logos). Cuando lleguen los logos, el PDF también debe usarlos (`documents/receipt_pdf.py` dibuja hoy el logotipo tipográfico).

