# Arquitectura del Sistema de Nómina Docente

Este documento describe el sistema a alto nivel: sus componentes, cómo se organizan las capas de cada aplicación y el modelo de datos conceptual. Las reglas de negocio completas y las convenciones están en [`CLAUDE.md`](../CLAUDE.md); el esquema de base de datos en [`base-de-datos.md`](base-de-datos.md) y la seguridad (autenticación, sesiones, CSRF, amenazas) en [`seguridad.md`](seguridad.md).

## 1. Visión general

El sistema permite a cada docente del Tecnológico de Estudios Superiores de Huixquilucan (TESH) registrar las materias que imparte, sus horarios y las sesiones que realmente dio, y obtener a partir de ello su recibo de nómina quincenal, calculado automáticamente y descargable en PDF.

Se compone de tres piezas que se ejecutan en el equipo local:

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| Frontend | Next.js (App Router), TypeScript | Interfaz en es-MX, formularios con validación, presentación de datos |
| Backend | FastAPI, SQLAlchemy 2.0 | API REST, reglas de negocio, autenticación, cálculo de nómina, PDF |
| Base de datos | PostgreSQL | Persistencia y tercer nivel de validación mediante restricciones |

## 2. Diagrama de componentes

```mermaid
flowchart LR
    user([Docente])

    subgraph browser[Navegador]
        ui[Interfaz Next.js<br/>React Hook Form + Zod<br/>TanStack Query]
    end

    subgraph next[Servidor Next.js :3000]
        guard[proxy.ts<br/>redirecciones por sesión]
        pages[Rutas y layouts<br/>App Router]
        proxy[Reenvío /api/*<br/>rewrites]
    end

    subgraph api[Backend FastAPI :8000]
        mw[Middlewares<br/>cabeceras, CORS, tamaño, CSRF]
        routers[Routers /api/v1]
        services[Servicios<br/>reglas de negocio]
        repos[Repositorios]
        pdf[Generador de PDF]
    end

    db[(PostgreSQL<br/>nomina_docente)]

    user --> ui
    ui -->|HTML/JS| guard
    guard --> pages
    ui -->|JSON + cookie httpOnly| proxy
    proxy --> mw
    mw --> routers
    routers --> services
    services --> repos
    services --> pdf
    repos -->|psycopg 3| db
```

El navegador solo se comunica con el origen del frontend. Next.js reenvía las peticiones `NEXT_PUBLIC_API_BASE_PATH/*` (`/api/v1/*`) a `API_PROXY_TARGET` mediante `rewrites`, de modo que la cookie de sesión es de primera parte y no se requieren excepciones de CORS en el uso normal. Se eligieron `rewrites` y no un *route handler* propio porque reenvían de forma transparente las cabeceras `Cookie` y `Set-Cookie` y el encabezado CSRF, sin código adicional que mantener. El destino se calcula al iniciar `next dev` o al compilar con `next build`.

## 3. Capas y regla de dependencias

### 3.1 Backend

El backend sigue una arquitectura limpia por capas. Cada capa solo conoce a la que está inmediatamente debajo.

```mermaid
flowchart TD
    subgraph http[Entrada HTTP]
        main[main.py<br/>crea la app y registra routers y middlewares]
        routers[api/v1/routers<br/>endpoints delgados]
    end

    subgraph domain[Dominio]
        services[services<br/>lógica de negocio, sin HTTP]
    end

    subgraph data[Datos]
        repos[repositories<br/>acceso a datos, sin reglas]
        models[models<br/>ORM, un archivo por entidad]
        dbm[db<br/>sesión y base declarativa]
    end

    schemas[schemas<br/>Pydantic de entrada y salida]
    core[core<br/>config, seguridad, logging,<br/>excepciones, constantes]

    main --> routers
    routers --> services
    services --> repos
    repos --> models
    models --> dbm

    routers -.usa.-> schemas
    services -.usa.-> schemas
    routers -.usa.-> core
    services -.usa.-> core
```

| Capa | Hace | No hace |
| --- | --- | --- |
| `api/v1/routers` | Recibe la petición, valida con `schemas`, obtiene al docente autenticado, llama al servicio y responde | Consultar la base de datos o aplicar reglas de negocio |
| `api/v1/dependencies.py` | Raíz de composición: construye cada servicio con sus repositorios y la sesión (`get_db`) y lo entrega a los routers mediante `Depends` | Contener lógica; es el único punto de la capa API que conoce sesiones y repositorios |
| `services` | Aplica las reglas de negocio (RN-XX), coordina repositorios, controla la transacción y lanza excepciones de dominio | Conocer `Request`, `Response` o códigos HTTP |
| `repositories` | Lee y escribe entidades, siempre filtradas por el docente dueño | Decidir si una operación es válida |
| `models` | Define tablas, relaciones y restricciones | Importar capas superiores |
| `schemas` | Define contratos de entrada y salida de la API | Depender de los modelos ORM |
| `core` | Configuración tipada, seguridad, logging, middleware de peticiones, excepciones y constantes | Contener lógica de una funcionalidad concreta |

**Arranque.** `main.create_app()` (patrón *app factory*) lee la configuración, configura el logging JSON y registra los middlewares (de afuera hacia adentro): contexto de petición (`X-Request-ID` y registro de cada petición), cabeceras de seguridad, CORS con la lista blanca de `CORS_ORIGINS`, límite de tamaño del cuerpo y CSRF *double-submit*; después, los manejadores de errores y el router de `/api/v1`. En producción no publica la documentación OpenAPI. `python -m app` levanta Uvicorn con el host y el puerto de la configuración. Si falta una variable de entorno, `get_settings()` lanza `ConfigurationError` con la lista de variables con problema y la app no inicia.

**Autenticación y acceso.** `api/v1/dependencies.py` ofrece `get_current_user`, `get_current_teacher` y `require_roles(...)`: toda ruta de negocio los declara y pasa el docente autenticado al servicio, que filtra por él (RN-04). La validación del JWT, la rotación de sesiones y la revocación viven en `services/sessions.py`; el registro e inicio de sesión en `services/auth.py`; el perfil y el cambio de contraseña en `services/account.py`. El servicio controla la transacción con `repositories/unit_of_work.py`. Las piezas sin estado (Argon2, JWT, política de contraseñas, middlewares, auditoría) están en `core/security/`. Detalle y diagramas en [`seguridad.md`](seguridad.md).

**Manejo de errores.** Los servicios lanzan excepciones de dominio (`NotFoundError`, `ConflictError`, `BusinessRuleError`, etc.). Un manejador central registrado en `main.py` las traduce a respuestas HTTP con un formato único:

```json
{ "error": { "code": "SCHEDULE_OVERLAP", "message": "…", "details": {} } }
```

```mermaid
sequenceDiagram
    participant R as Router
    participant S as Servicio
    participant Rp as Repositorio
    participant DB as PostgreSQL
    participant H as Manejador de errores

    R->>S: create_schedule(teacher, data)
    S->>Rp: find_overlapping(teacher, weekday, range)
    Rp->>DB: SELECT ...
    DB-->>Rp: horario existente
    Rp-->>S: [Schedule]
    S--xH: raise ScheduleOverlapError
    H-->>R: 409 { error: { code: "SCHEDULE_OVERLAP" } }
```

### 3.2 Frontend

El frontend se organiza por funcionalidades. Las rutas de `app/` solo componen piezas; la lógica vive en `features/`.

```mermaid
flowchart TD
    app[app/<br/>rutas y layouts]

    subgraph features[features/]
        auth[auth]
        assignments[assignments]
        schedules[schedules]
        logbook[logbook]
        payroll[payroll]
    end

    subgraph shared[Compartido]
        ui[components/ui<br/>shadcn]
        layout[components/layout]
        lib[lib<br/>cliente HTTP, formateadores,<br/>manejo de errores]
        config[config<br/>variables de entorno]
        constants[constants<br/>textos y rutas]
        styles[styles<br/>tokens de diseño]
    end

    app --> features
    app --> layout
    features --> ui
    features --> lib
    features --> constants
    layout --> ui
    lib --> config
    ui --> styles
```

Cada feature contiene `components/`, `hooks/`, `api/`, `schemas/` y `types/`. Una feature no importa archivos internos de otra; lo compartido se mueve a `components/`, `lib/` o `constants/`. La feature `system-status` es temporal (etapa 1): muestra el resultado de `GET /api/v1/health` en la página inicial y se retirará cuando exista el panel principal.

**Rutas y sesión.** Las rutas están en español y centralizadas en `constants/routes.ts`: `/iniciar-sesion`, `/registro` y `/panel` (provisional hasta la etapa 6). `src/proxy.ts` (en Next.js 16, `middleware` se llama `proxy`) redirige a `/iniciar-sesion?siguiente=…` si no hay sesión y al panel si ya la hay, mirando solo una cookie indicadora; la autorización real la hace la API. La feature `auth` contiene las llamadas tipadas, los esquemas de Zod (construidos con la política de contraseñas que publica el backend), los hooks (`useSession`, `useLogin`, `useRegister`, `useLogout`, `usePasswordPolicy`) y los formularios.

**Acceso a la API y errores.** El flujo de una consulta es siempre el mismo:

```mermaid
flowchart LR
    comp[Componente] --> hook[hook de la feature<br/>useQuery]
    hook --> fapi[features/*/api]
    fapi --> client[lib/api-client.ts<br/>valida con Zod]
    client -->|/api/v1/* mismo origen| proxy[rewrites de Next.js]
    proxy --> backend[FastAPI]
    client -.error.-> apierr[lib/api-error.ts<br/>ApiError + mensaje es-MX<br/>desde constants/]
```

- `api-client.ts` es el único módulo que usa `fetch` (lo garantiza una regla de ESLint). Envía `X-CSRF-Token` en los métodos que modifican datos (y pide el token si aún no existe), valida cada respuesta con un schema de Zod y convierte cualquier falla en `ApiError`. Ante un 401 renueva la sesión **una sola vez**, compartida entre las peticiones simultáneas, y repite la petición; si no puede, avisa para llevar a iniciar sesión.
- `api-error.ts` interpreta el formato único de error del backend. Si el backend no responde (el proxy devuelve 5xx sin JSON), usa el código local `BACKEND_UNAVAILABLE`. `toUserMessage()` es el único punto que traduce errores a textos en español.
- Las variables de entorno se validan con Zod en `config/`. `next.config.ts` reutiliza esa validación para construir el proxy.

## 4. Modelo de datos conceptual

Vista resumida. El esquema completo, con el diccionario de datos y las decisiones de diseño, está en [`base-de-datos.md`](base-de-datos.md).

```mermaid
erDiagram
    USER ||--|| TEACHER : "tiene perfil"
    USER ||--o{ USER_ROLE : "tiene"
    ROLE ||--o{ USER_ROLE : "se asigna en"
    USER ||--o{ AUTH_SESSION : "inicia"
    AUTH_SESSION ||--|{ REFRESH_TOKEN : "rota"

    TEACHER ||--o{ SUBJECT : "registra"
    TEACHER ||--o{ ASSIGNMENT : "imparte"
    SUBJECT ||--o{ ASSIGNMENT : "se imparte en"
    CAREER ||--o{ ASSIGNMENT : "agrupa"
    HOURLY_RATE ||--o{ ASSIGNMENT : "tarifa de"
    CAREER_TYPE ||--o{ CAREER : "clasifica"

    ASSIGNMENT ||--o{ SCHEDULE : "tiene horarios"
    ASSIGNMENT ||--o{ LOGBOOK_ENTRY : "registra sesiones"

    TEACHER ||--o{ PAYROLL_RECEIPT : "recibe"
    PAYROLL_RECEIPT ||--|{ PAYROLL_RECEIPT_LINE : "desglosa"
    ASSIGNMENT ||--o{ PAYROLL_RECEIPT_LINE : "origina"

    TEACHER {
        string first_names
        string paternal_surname
        string maternal_surname
        string employee_number "opcional, único"
    }
    CAREER_TYPE {
        string code "engineering, bachelor"
        string name "único"
    }
    CAREER {
        string code "único, p. ej. ISC"
        string name "único"
        bool is_active
    }
    SUBJECT {
        string name "único por docente"
        string code "opcional"
    }
    HOURLY_RATE {
        numeric amount "125, 135, 145 (semilla)"
        bool is_active
    }
    ASSIGNMENT {
        bool is_active
    }
    SCHEDULE {
        int weekday "1 = lunes ... 7 = domingo"
        time start_time
        time end_time "mayor que start_time"
    }
    LOGBOOK_ENTRY {
        date session_date
        time start_time
        time end_time
        string notes "opcional"
    }
    PAYROLL_RECEIPT {
        string folio "único"
        int year
        int month
        int fortnight "1 o 2"
        numeric total_amount
    }
    PAYROLL_RECEIPT_LINE {
        string subject_name "copia"
        string career_name "copia"
        int minutes
        numeric hourly_rate "copia"
        numeric amount
    }
```

Puntos clave del modelo:

- **Identidad y perfil separados.** `USER` guarda credenciales; `TEACHER` guarda los datos del docente. Los roles se asignan por `USER_ROLE`, lo que permite agregar un administrador sin rehacer tablas.
- **Catálogos en base de datos.** Carreras (con su tipo: ingeniería o licenciatura), tarifas y roles son catálogos con datos semilla; el frontend obtiene sus opciones de la API. Las 7 carreras salen del volante oficial de admisión 2024 del TESH.
- **Recibo congelado.** Al emitirse, cada renglón copia materia, carrera, tarifa, minutos e importe, y el encabezado copia los datos del docente. Triggers de la base impiden modificar o borrar el recibo y cierran la bitácora del periodo.
- **Identificadores.** Llave primaria `bigint` identity en todas las tablas; las entidades del docente que expone la API tienen además un `public_id` UUID para no revelar identificadores secuenciales.
- **Validación en base de datos.** Restricciones `CHECK`, llaves foráneas (algunas compuestas, para que los datos de un docente nunca se mezclen con los de otro) y restricciones de exclusión con `btree_gist` (no empalme de horarios ni de sesiones) protegen los datos aunque falle una validación previa.

## 5. Flujo principal

```mermaid
flowchart LR
    a[Registro e<br/>inicio de sesión] --> b[Registrar materias]
    b --> c[Crear asignaciones<br/>materia + carrera + tarifa]
    c --> d[Definir horarios<br/>semanales]
    d --> e[Capturar bitácora<br/>precargada del horario]
    e --> f[Vista previa del<br/>recibo quincenal]
    f --> g[Emitir recibo<br/>folio + PDF]
```

## 6. Cálculo de la nómina

Para un periodo quincenal (1 al 15, o 16 al último día del mes):

1. Se obtienen las sesiones de bitácora del docente cuya fecha cae en el periodo.
2. Se agrupan por asignación y se suman sus minutos.
3. `importe = minutos × tarifa / 60`, redondeado a 2 decimales con `ROUND_HALF_UP`.
4. `total bruto = suma de importes`.

Todo el cálculo usa `Decimal` en Python y `NUMERIC` en PostgreSQL. No se calculan deducciones (ISR, IMSS) en esta versión.
