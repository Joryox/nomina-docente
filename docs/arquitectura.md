# Arquitectura del Sistema de Nómina Docente

Este documento describe el sistema a alto nivel: sus componentes, cómo se organizan las capas de cada aplicación y el modelo de datos conceptual. Las reglas de negocio completas y las convenciones están en [`CLAUDE.md`](../CLAUDE.md).

## 1. Visión general

El sistema permite a cada docente del TESH registrar las materias que imparte, sus horarios y las sesiones que realmente dio, y obtener a partir de ello su recibo de nómina quincenal, calculado automáticamente y descargable en PDF.

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
        pages[Rutas y layouts<br/>App Router]
        proxy[Proxy /api/*<br/>rewrites]
    end

    subgraph api[Backend FastAPI :8000]
        routers[Routers /api/v1]
        services[Servicios<br/>reglas de negocio]
        repos[Repositorios]
        pdf[Generador de PDF]
    end

    db[(PostgreSQL<br/>nomina_docente)]

    user --> ui
    ui -->|HTML/JS| pages
    ui -->|JSON + cookie httpOnly| proxy
    proxy --> routers
    routers --> services
    services --> repos
    services --> pdf
    repos -->|psycopg 3| db
```

El navegador solo se comunica con el origen del frontend. Next.js reenvía las peticiones `/api/*` al backend, de modo que la cookie de sesión es de primera parte y no se requieren excepciones de CORS en el uso normal.

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
| `services` | Aplica las reglas de negocio (RN-XX), coordina repositorios, controla la transacción y lanza excepciones de dominio | Conocer `Request`, `Response` o códigos HTTP |
| `repositories` | Lee y escribe entidades, siempre filtradas por el docente dueño | Decidir si una operación es válida |
| `models` | Define tablas, relaciones y restricciones | Importar capas superiores |
| `schemas` | Define contratos de entrada y salida de la API | Depender de los modelos ORM |
| `core` | Configuración tipada, seguridad, logging, excepciones y constantes | Contener lógica de una funcionalidad concreta |

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

Cada feature contiene `components/`, `hooks/`, `api/`, `schemas/` y `types/`. Una feature no importa archivos internos de otra; lo compartido se mueve a `components/`, `lib/` o `constants/`.

## 4. Modelo de datos conceptual

```mermaid
erDiagram
    USER ||--|| TEACHER : "tiene perfil"
    USER ||--o{ USER_ROLE : "tiene"
    ROLE ||--o{ USER_ROLE : "se asigna en"

    TEACHER ||--o{ SUBJECT : "registra"
    TEACHER ||--o{ ASSIGNMENT : "imparte"
    SUBJECT ||--o{ ASSIGNMENT : "se imparte en"
    CAREER ||--o{ ASSIGNMENT : "agrupa"
    HOURLY_RATE ||--o{ ASSIGNMENT : "tarifa de"

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
    CAREER {
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
- **Catálogos en base de datos.** Carreras y tarifas son catálogos con datos semilla; el frontend obtiene sus opciones de la API.
- **Recibo congelado.** Al emitirse, cada renglón copia materia, carrera, tarifa, minutos e importe. El recibo no cambia aunque los catálogos cambien después.
- **Validación en base de datos.** Restricciones `CHECK`, llaves foráneas y restricciones de exclusión (no empalme de horarios ni de sesiones) protegen los datos aunque falle una validación previa.

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
