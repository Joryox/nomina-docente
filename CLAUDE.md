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
| Institución | TESH (Tecnológico de Estudios Superiores). Logos oficiales pendientes; van en `frontend/public/brand/` |
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

- **RN-05 Catálogo de carreras.** Las carreras son un catálogo administrado en base de datos (por ejemplo: Ingeniería en Sistemas Computacionales, Derecho, Bachillerato). El catálogo completo del TESH se carga con datos semilla en la etapa 2.
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
- **RN-14 Unicidad.** Un docente no puede tener dos asignaciones con la misma materia en la misma carrera.
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
| Framework | Next.js con App Router |
| Lenguaje | TypeScript con `strict: true`; prohibido `any` |
| Estilos | Tailwind CSS con tokens en variables CSS |
| Componentes | shadcn/ui (adaptado a las reglas de diseño de la sección 7) |
| Animación | Framer Motion (respetando `prefers-reduced-motion`) |
| Formularios | React Hook Form + Zod |
| Datos del servidor | TanStack Query |
| Paquetes | npm (`package-lock.json` versionado) |
| Calidad | ESLint + Prettier |

### 3.3 Base de datos

- PostgreSQL local (versión instalada en el equipo de desarrollo: 18).
- `nomina_docente` para desarrollo y `nomina_docente_test` para pruebas automatizadas.
- Extensiones previstas: `btree_gist` (restricciones de no empalme, sección 5.3) y `unaccent` (comparación de nombres de materia, RN-09). Se habilitan desde una migración de Alembic, nunca a mano.

### 3.4 Comunicación frontend ↔ backend

- API REST versionada bajo `/api/v1`.
- En desarrollo, Next.js reenvía `/api/*` al backend mediante `rewrites` (destino tomado de la variable `API_PROXY_TARGET`). Así el navegador solo habla con un origen, la cookie de sesión es de primera parte y se evitan problemas de CORS. CORS se configura de todos modos con una lista blanca explícita (`CORS_ORIGINS`).
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
│   ├── main.py              → solo crea la app y registra routers y middlewares
│   ├── core/                → config (pydantic-settings), seguridad, logging, excepciones, constantes
│   ├── db/                  → sesión, base declarativa
│   ├── models/              → modelos ORM (un archivo por entidad)
│   ├── schemas/             → modelos Pydantic de entrada/salida
│   ├── repositories/        → acceso a datos (sin lógica de negocio)
│   ├── services/            → lógica de negocio (sin saber de HTTP)
│   ├── api/v1/routers/      → endpoints delgados (validan, llaman al service, responden)
│   ├── seeds/               → datos semilla (carreras, tarifas, roles) separados de la lógica
│   └── utils/
├── alembic/                 → migraciones
├── tests/
│   ├── unit/                → espejo de src/app/
│   └── integration/         → espejo de src/app/
├── pyproject.toml
└── .env.example
```

**Regla de dependencias:** `routers → services → repositories → models`. Nunca al revés. Nunca un router consulta la base de datos directamente.

| Capa | Puede importar | No puede |
| --- | --- | --- |
| `api/v1/routers` | `services`, `schemas`, dependencias de `core` | usar `Session`, `repositories` o `models` |
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
│   │   └── <feature>/       → components/, hooks/, api/, schemas/, types/
│   ├── components/ui/       → componentes base (shadcn)
│   ├── components/layout/   → encabezado, barra lateral, etc.
│   ├── lib/                 → cliente HTTP, utilidades, formateadores (moneda, fechas)
│   ├── config/              → configuración leída de variables de entorno
│   ├── constants/           → textos y rutas centralizados
│   └── styles/              → tokens de diseño (variables CSS)
├── public/brand/            → logos oficiales
└── .env.example
```

Reglas:

- `app/` no contiene lógica: compone componentes de `features/` y `components/`.
- Una feature no importa archivos internos de otra feature; lo compartido sube a `components/`, `lib/` o `constants/`.
- Todo acceso a la API pasa por el cliente HTTP de `lib/` y por los módulos `features/<feature>/api/`. Los componentes nunca llaman a `fetch` directamente.
- Los schemas de Zod viven en `features/<feature>/schemas/` y sus mensajes salen de `constants/`.

### 4.4 Cero hardcodeo (aplica a todo el proyecto, siempre)

- **Tarifas por hora:** tabla catálogo `hourly_rates` con datos semilla (125, 135, 145). La asignación la referencia con llave foránea y el frontend obtiene las opciones desde la API. **No** se usa un `CHECK` con valores fijos (esta regla sustituye la idea original de un `CHECK (rate IN (125, 135, 145))`).
- **Carreras, materias y tarifas:** siempre desde la base de datos; nunca listas escritas en el frontend.
- **Configuración** (URLs, puertos, credenciales, duración del token, CORS, nombre de la institución, prefijo de folio): variables de entorno leídas por un módulo de configuración tipado (`backend/src/app/core/config.py` con pydantic-settings; `frontend/src/config/`). Si falta una variable obligatoria, la app **falla al iniciar** con un mensaje claro que nombra la variable.
- **Reglas de periodo, formatos y zona horaria:** constantes con nombre en un solo módulo por app (`backend/src/app/core/constants.py`; `frontend/src/constants/`). Ejemplos: `FIRST_FORTNIGHT_LAST_DAY = 15`, `TIMEZONE = "America/Mexico_City"`, `MONEY_DECIMAL_PLACES = 2`. Nada de números mágicos repartidos por el código.
- **Textos de la interfaz y mensajes de error:** centralizados en `frontend/src/constants/`, no regados en los componentes.
- **Colores, espaciados y tipografía:** tokens de diseño en variables CSS expuestas a Tailwind. Prohibido escribir colores sueltos (`#1a2b3c`, `rgb(...)`, `bg-[#...]`) dentro de componentes.
- **Datos semilla** (carreras, tarifas, roles): en `backend/src/app/seeds/`, separados de la lógica, cargados por un comando idempotente.

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

Diseño de referencia para la etapa 2. Tablas y columnas en inglés `snake_case`, nombres de tabla en plural. Todas las tablas tienen `id` (`bigint` identity) y, cuando aplica, `created_at` / `updated_at` (`timestamptz`).

### 5.1 Tablas

| Tabla | Propósito | Columnas clave |
| --- | --- | --- |
| `users` | Identidad y credenciales | `email` (único, normalizado), `password_hash`, `is_active` |
| `roles` | Catálogo de roles | `code` (único, p. ej. `teacher`), `name` |
| `user_roles` | Relación N:M usuario–rol | `user_id`, `role_id` (PK compuesta) |
| `teachers` | Perfil del docente | `user_id` (único, FK), `first_names`, `paternal_surname`, `maternal_surname`, `employee_number` (único, nulo permitido) |
| `careers` | Catálogo de carreras | `name` (único), `is_active` |
| `subjects` | Materias del docente | `teacher_id`, `name`, `code` (opcional); único por docente sobre el nombre normalizado |
| `hourly_rates` | Catálogo de tarifas | `amount` `NUMERIC(10,2)` único, `CHECK (amount > 0)`, `is_active` |
| `assignments` | Docente + materia + carrera + tarifa | `teacher_id`, `subject_id`, `career_id`, `hourly_rate_id`, `is_active`; único `(teacher_id, subject_id, career_id)` |
| `schedules` | Horario semanal | `assignment_id`, `teacher_id`, `weekday` (1 = lunes … 7 = domingo, ISO 8601), `start_time`, `end_time` |
| `logbook_entries` | Sesiones impartidas | `assignment_id`, `teacher_id`, `session_date`, `start_time`, `end_time`, `notes` |
| `payroll_receipts` | Recibo emitido | `teacher_id`, `folio` (único), `year`, `month`, `fortnight` (1 o 2), `period_start`, `period_end`, `total_amount` `NUMERIC(12,2)`, `issued_at`; único `(teacher_id, year, month, fortnight)` |
| `payroll_receipt_lines` | Renglones congelados del recibo | `receipt_id`, `assignment_id`, `subject_name`, `career_name`, `minutes`, `hourly_rate`, `amount` |

### 5.2 Roles sin rehacer tablas

La identidad (`users`) está separada del perfil (`teachers`) y los permisos se asignan por `user_roles`. En esta versión todo usuario registrado recibe el rol `teacher`. Agregar un administrador en el futuro es insertar un rol y, si hace falta, una tabla de perfil propia; las tablas existentes no cambian.

### 5.3 Restricciones en base de datos (tercer nivel de validación)

- `CHECK (end_time > start_time)` en `schedules` y `logbook_entries` (RN-17).
- `CHECK (weekday BETWEEN 1 AND 7)` y `CHECK (fortnight IN (1, 2))`.
- **No empalme (RN-18, RN-22):** `schedules` y `logbook_entries` guardan `teacher_id` de forma redundante, amarrado con una FK compuesta `(assignment_id, teacher_id) → assignments(id, teacher_id)` para que nunca diverja. Con eso se define una restricción de exclusión con `btree_gist`:
  - PostgreSQL no incluye un tipo de rango para `time`, así que una migración crea `CREATE TYPE timerange AS RANGE (subtype = time)`.
  - `schedules`: `EXCLUDE USING gist (teacher_id WITH =, weekday WITH =, timerange(start_time, end_time, '[)') WITH &&)`.
  - `logbook_entries`: `EXCLUDE USING gist (teacher_id WITH =, session_date WITH =, timerange(start_time, end_time, '[)') WITH &&)`.
  El servicio valida antes (para dar un mensaje claro) y la base de datos garantiza el invariante ante cualquier condición de carrera.
- Llaves foráneas con `ON DELETE RESTRICT` por defecto; `CASCADE` solo de `assignments` a `schedules` (RN-15) y de `payroll_receipts` a `payroll_receipt_lines`.
- Las líneas del recibo copian nombre de materia, nombre de carrera y tarifa (RN-28): el recibo emitido no depende de que los catálogos sigan iguales.

---

## 6. Seguridad

- **Contraseñas:** hash Argon2id; nunca se registran ni se devuelven. Longitud mínima de 8 caracteres (constante con nombre).
- **Sesión:** JWT firmado (HS256 por defecto, configurable) con `sub` = id de usuario y expiración configurable (`ACCESS_TOKEN_EXPIRE_MINUTES`).
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
- **Commits:** Conventional Commits en español, en modo imperativo de tercera persona. Ejemplos: `feat: agrega registro de docentes`, `fix: corrige el cálculo de la segunda quincena`, `docs: actualiza la hoja de ruta`. Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`.
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
| Python | 3.12 | backend (uv puede administrar la versión) |
| uv | 0.5 | dependencias y entorno virtual del backend |
| Node.js | 20.9 (se recomienda la LTS vigente) | frontend |
| npm | 10 | dependencias del frontend |
| PostgreSQL / psql | 16 | base de datos y scripts |

### 9.2 Plataforma

- El proyecto se documenta para **Linux**. Los scripts de `scripts/` son Bash y también deben funcionar en Windows con Git Bash.
- Estado del equipo actual (verificado en la etapa 0, 2026-10-25): Windows 11 con Git Bash; PostgreSQL 18 instalado como servicio pero `psql` fuera del `PATH`. Ver sección 12.
- Finales de línea: LF en todo el repositorio (`.editorconfig`). En Windows, el repositorio local se configura con `git config core.autocrlf false` y `git config core.eol lf` (no se usa `.gitattributes` para respetar la regla de raíz ordenada, sección 4.1).

### 9.3 Puertos y URLs locales

| Servicio | URL |
| --- | --- |
| Backend (FastAPI) | `http://localhost:8000` (documentación interactiva en `/docs`) |
| Frontend (Next.js) | `http://localhost:3000` |
| PostgreSQL | `localhost:5432` |

### 9.4 Variables de entorno

Documentadas en [`backend/.env.example`](backend/.env.example) y [`frontend/.env.example`](frontend/.env.example). Toda variable nueva se agrega primero ahí y en el módulo de configuración tipado.

---

## 10. Hoja de ruta

- [x] **0. Cimientos y CLAUDE.md**
- [ ] **1. Arquitectura base del backend y frontend** (proyectos inicializados y conectados)
- [ ] **2. Base de datos:** modelos, migraciones y catálogo de carreras
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
| Catálogo completo de carreras del TESH | 2 | Se carga como datos semilla; confirmar la lista oficial |
| Nombre completo de la institución | 1 | Confirmar el nombre oficial para `INSTITUTION_NAME` |

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
