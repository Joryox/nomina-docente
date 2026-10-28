# API del Sistema de Nómina Docente

Referencia de la API REST: convenciones, endpoints y catálogo de códigos de error. La documentación interactiva (con esquemas, ejemplos y la opción de probar cada ruta) está en `http://localhost:8000/docs` cuando el backend corre fuera de producción. Las reglas de negocio citadas (`RN-XX`) se explican en [`reglas-de-negocio.md`](reglas-de-negocio.md) y la seguridad en [`seguridad.md`](seguridad.md).

> Las tablas de endpoints y de códigos se generaron a partir del esquema OpenAPI y de `ERROR_CATALOG` (`backend/src/app/core/exceptions.py`). Si cambian, se regeneran; el frontend obtiene los mismos contratos con `npm run api:types`.

## 1. Convenciones

| Aspecto | Regla |
| --- | --- |
| Prefijo | `/api/v1`. En desarrollo el navegador llama a `http://localhost:3000/api/v1/*` y Next.js lo reenvía al backend |
| Autenticación | Cookie `HttpOnly` con el JWT de acceso. Toda ruta de negocio exige una sesión de docente; un recurso de otro docente responde **404** (RN-04) |
| CSRF | Todo `POST`, `PATCH` y `DELETE` lleva el encabezado `X-CSRF-Token` con el valor de la cookie CSRF (`GET /auth/csrf`) |
| Identificadores | Las entidades del docente se identifican por su `id` público (UUID). Los catálogos, por su llave natural: carrera por `code` (`"ISC"`), tarifa por `amount` (`"135.00"`) |
| Dinero y horas | Cadenas decimales con dos decimales: `"1250.00"`, `"12.50"`. **Nunca** números JSON. Una tarifa enviada como número (`135.0`) se rechaza con `VALIDATION_ERROR` |
| Horas del día | `"HH:MM"` en 24 horas, sin segundos: `"07:00"`, `"14:30"` |
| Fechas | ISO 8601: `"2026-10-19"`. Se interpretan en `America/Mexico_City` |
| Día de la semana | ISO 8601: 1 = lunes … 7 = domingo |
| Quincena | `year`, `month` (1–12) y `fortnight` (1: días 1 al 15; 2: día 16 al último del mes) |
| Entradas | Campos desconocidos se rechazan (`extra="forbid"`): no se puede enviar `teacher_id`, `minutes` ni `amount` |
| Cálculos | Minutos, horas, importes y totales los calcula siempre el servidor |

### 1.1 Paginación y filtros

Todos los listados aceptan `page` (desde 1) y `page_size` (de 1 a 100, por defecto 20) y responden con el mismo sobre:

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total_items": 41,
  "total_pages": 3
}
```

Los filtros son parámetros de consulta con el mismo nombre en todas las rutas: `status` (`active` por defecto, `inactive` o `all`) en materias y asignaciones; `search` en materias; `subject_id` y `career_code` en asignaciones; `date_from`, `date_to`, `assignment_id` y la quincena (`year`, `month` y `fortnight`, los tres juntos) en la bitácora; `year` en recibos. La bitácora agrega `totals` (sesiones, minutos y horas de **todo** el filtro, no solo de la página).

### 1.2 Errores

Todas las respuestas de error tienen el mismo formato:

```json
{
  "error": {
    "code": "SCHEDULE_OVERLAP",
    "message": "El miércoles, 07:00–09:00 se empalma con Bases de Datos (Ingeniería en Sistemas Computacionales, grupo 3101), de 08:00–10:00. No se guardó ningún horario. Elige otra hora de entrada o de salida para ese día.",
    "details": {
      "weekday": 3,
      "start_time": "07:00",
      "end_time": "09:00",
      "all_or_nothing": true,
      "conflicts": [
        {
          "subject_name": "Bases de Datos",
          "career_code": "ISC",
          "career_name": "Ingeniería en Sistemas Computacionales",
          "group": "3101",
          "weekday": 3,
          "start_time": "08:00",
          "end_time": "10:00"
        }
      ]
    }
  }
}
```

- `code` es estable y en inglés: el frontend reacciona a él sin comparar textos y muestra su propio mensaje desde `src/constants/error-messages.ts`.
- `message` está en español y dice qué pasó y cómo corregirlo; cuando el servidor conoce el detalle (con qué clase choca, cuál es el límite), lo incluye.
- `details` lleva los datos para construir un mensaje preciso. En el registro rápido de bitácora incluye `entry_index`: cuál de las clases falló.
- Si la base de datos rechaza una escritura (por ejemplo, dos peticiones simultáneas que pasaron la validación), el servicio traduce la restricción al mismo código (`backend/src/app/services/constraints.py`); nunca responde 500 por una regla de negocio.

### 1.3 Advertencias

Algunas operaciones se permiten pero conviene revisar algo. La respuesta incluye `warnings: [{ code, message, details }]`:

| Código | Dónde | Significado |
| --- | --- | --- |
| `SESSION_NOT_SCHEDULED` | Registrar o editar sesión | La asignación no tiene clase programada ese día de la semana |
| `SESSION_TIMES_DIFFER` | Registrar o editar sesión | Hay clase ese día, pero con otra entrada o salida (`details.scheduled`) |
| `PERIOD_NOT_FINISHED` | Vista previa | La quincena está en curso: la vista previa puede cambiar |
| `SCHEDULED_CLASSES_NOT_REGISTERED` | Vista previa | Clases programadas que ya terminaron y no están en la bitácora (`details.count`, `details.items`) |
| `SESSIONS_OUTSIDE_SCHEDULE` | Vista previa | Sesiones que no coinciden con el horario |
| `ASSIGNMENT_RATE_CHANGED` | Vista previa | La tarifa de una asignación cambió dentro de la quincena: hay un renglón por tarifa |

## 2. Endpoints

"Sesión: No" significa que la ruta funciona sin sesión iniciada (registro, inicio de sesión, CSRF, salud). `/auth/refresh` usa la cookie de refresh y `/auth/logout` es idempotente.

### Autenticación

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/change-password` | Cambiar mi contraseña | Docente | Sí |
| `GET` | `/auth/csrf` | Obtener el token CSRF | No | — |
| `POST` | `/auth/login` | Iniciar sesión | No | Sí |
| `POST` | `/auth/logout` | Cerrar la sesión actual | No | Sí |
| `POST` | `/auth/logout-all` | Cerrar todas las sesiones | Docente | Sí |
| `GET` | `/auth/me` | Consultar mi cuenta | Docente | — |
| `PATCH` | `/auth/me` | Actualizar mi perfil | Docente | Sí |
| `GET` | `/auth/password-policy` | Consultar la política de contraseñas | No | — |
| `POST` | `/auth/refresh` | Renovar la sesión | No | Sí |
| `POST` | `/auth/register` | Registrar una cuenta de docente | No | Sí |

### Catálogos

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/catalogs/business-rules` | Consultar reglas configurables | Docente | — |
| `GET` | `/catalogs/careers` | Listar carreras activas | Docente | — |
| `GET` | `/catalogs/hourly-rates` | Listar tarifas vigentes | Docente | — |

### Materias

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/subjects` | Listar mis materias | Docente | — |
| `POST` | `/subjects` | Registrar una materia | Docente | Sí |
| `GET` | `/subjects/{subject_id}` | Consultar una materia | Docente | — |
| `PATCH` | `/subjects/{subject_id}` | Editar una materia | Docente | Sí |
| `DELETE` | `/subjects/{subject_id}` | Quitar una materia | Docente | Sí |
| `POST` | `/subjects/{subject_id}/reactivate` | Reactivar una materia | Docente | Sí |

### Asignaciones

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/assignments` | Listar mis asignaciones | Docente | — |
| `POST` | `/assignments` | Crear una asignación | Docente | Sí |
| `GET` | `/assignments/{assignment_id}` | Consultar una asignación | Docente | — |
| `PATCH` | `/assignments/{assignment_id}` | Editar una asignación | Docente | Sí |
| `DELETE` | `/assignments/{assignment_id}` | Borrar una asignación | Docente | Sí |
| `POST` | `/assignments/{assignment_id}/deactivate` | Desactivar una asignación | Docente | Sí |
| `POST` | `/assignments/{assignment_id}/reactivate` | Reactivar una asignación | Docente | Sí |
| `GET` | `/assignments/{assignment_id}/schedules` | Listar los horarios de una asignación | Docente | — |
| `POST` | `/assignments/{assignment_id}/schedules` | Agregar un horario | Docente | Sí |
| `POST` | `/assignments/{assignment_id}/schedules/batch` | Agregar horarios de varios días (todo o nada, RN-42) | Docente | Sí |

### Horarios

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/schedules/weekly` | Consultar mi horario semanal | Docente | — |
| `PATCH` | `/schedules/{schedule_id}` | Editar un horario | Docente | Sí |
| `DELETE` | `/schedules/{schedule_id}` | Borrar un horario | Docente | Sí |

### Bitácora

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/logbook` | Consultar mi bitácora | Docente | — |
| `POST` | `/logbook` | Registrar una sesión impartida | Docente | Sí |
| `POST` | `/logbook/quick` | Registro rápido de varias clases | Docente | Sí |
| `GET` | `/logbook/scheduled` | Clases programadas para una fecha | Docente | — |
| `GET` | `/logbook/{entry_id}` | Consultar una sesión | Docente | — |
| `PATCH` | `/logbook/{entry_id}` | Editar una sesión | Docente | Sí |
| `DELETE` | `/logbook/{entry_id}` | Borrar una sesión | Docente | Sí |

### Nómina

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/payroll/periods` | Quincenas de un año | Docente | — |
| `GET` | `/payroll/preview` | Vista previa del recibo | Docente | — |
| `GET` | `/payroll/receipts` | Listar mis recibos | Docente | — |
| `POST` | `/payroll/receipts` | Emitir el recibo de una quincena | Docente | Sí |
| `GET` | `/payroll/receipts/{receipt_id}` | Consultar un recibo (incluye `total_amount_words`: el total con letra) | Docente | — |
| `GET` | `/payroll/receipts/{receipt_id}/pdf` | Descargar el recibo en PDF (carta; `Content-Disposition` con folio y periodo: `recibo-NOM-202610-Q1-000042-2026-10-q1.pdf`) | Docente | — |

### Panel

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/dashboard/summary` | Resumen del panel principal (quincena actual, clases de hoy, clases pendientes, últimos recibos, quincenas sin recibo y avance de la configuración) | Docente | — |

### Salud

| Método | Ruta | Descripción | Sesión | CSRF |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Estado de la API y de la base de datos | No | — |


## 3. Catálogo de códigos de error

Cada código tiene un estado HTTP fijo y un mensaje por defecto; el servicio puede enviar un mensaje más preciso con los datos del caso. 404 = no existe o es de otro docente; 409 = choca con datos existentes o con un periodo emitido; 422 = datos o regla de negocio inválidos.

| Código | HTTP | Mensaje por defecto |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | La solicitud no es válida. |
| `NOT_FOUND` | 404 | El recurso solicitado no existe. |
| `METHOD_NOT_ALLOWED` | 405 | El método no está permitido en esta ruta. |
| `CONFLICT` | 409 | La operación entra en conflicto con datos existentes. |
| `BUSINESS_RULE_VIOLATION` | 422 | La operación no cumple una regla de negocio. |
| `VALIDATION_ERROR` | 422 | Los datos enviados no son válidos. |
| `PAYLOAD_TOO_LARGE` | 413 | La solicitud es demasiado grande. |
| `INTERNAL_ERROR` | 500 | Ocurrió un error inesperado. Intenta de nuevo más tarde. |
| `NOT_AUTHENTICATED` | 401 | Inicia sesión para continuar. |
| `ACCESS_TOKEN_EXPIRED` | 401 | Tu sesión expiró. Vuelve a iniciar sesión. |
| `SESSION_INVALID` | 401 | Tu sesión ya no es válida. Vuelve a iniciar sesión. |
| `SESSION_REFRESH_CONFLICT` | 409 | La sesión se acaba de renovar en otra pestaña. |
| `INVALID_CREDENTIALS` | 401 | Correo o contraseña incorrectos. |
| `ACCOUNT_LOCKED` | 401 | Tu cuenta está bloqueada temporalmente por varios intentos fallidos. |
| `CURRENT_PASSWORD_INCORRECT` | 400 | La contraseña actual no es correcta. |
| `PERMISSION_DENIED` | 403 | No tienes permiso para realizar esta acción. |
| `TEACHER_PROFILE_REQUIRED` | 403 | Esta cuenta no tiene un perfil de docente. |
| `CSRF_TOKEN_INVALID` | 403 | La sesión de seguridad del formulario expiró. Recarga la página e intenta de nuevo. |
| `CSRF_ORIGIN_NOT_ALLOWED` | 403 | La solicitud viene de un origen no permitido. |
| `EMAIL_ALREADY_REGISTERED` | 409 | Ya existe una cuenta con este correo. Inicia sesión o usa otro correo. |
| `EMPLOYEE_NUMBER_ALREADY_REGISTERED` | 409 | Ese número de empleado ya está registrado en otra cuenta. |
| `PASSWORD_POLICY_VIOLATION` | 422 | La contraseña no cumple los requisitos de seguridad. |
| `CAREER_NOT_FOUND` | 404 | La carrera no existe. Elige una carrera de la lista. |
| `CAREER_INACTIVE` | 422 | La carrera ya no está disponible. Elige otra carrera de la lista. |
| `RATE_NOT_FOUND` | 404 | La tarifa no existe en el catálogo. Elige una tarifa de la lista. |
| `RATE_INACTIVE` | 422 | La tarifa ya no está vigente. Elige una tarifa vigente de la lista. |
| `SUBJECT_NOT_FOUND` | 404 | La materia no existe. |
| `SUBJECT_ALREADY_EXISTS` | 409 | Ya registraste una materia con ese nombre. Usa la que ya existe. |
| `SUBJECT_INACTIVE` | 422 | La materia está desactivada. Reactívala antes de usarla. |
| `SUBJECT_HAS_ACTIVE_ASSIGNMENTS` | 409 | La materia tiene asignaciones activas. Desactívalas o elimínalas antes de quitarla. |
| `ASSIGNMENT_NOT_FOUND` | 404 | La asignación no existe. |
| `ASSIGNMENT_ALREADY_EXISTS` | 409 | Ya tienes una asignación activa de esa materia en esa carrera y grupo. |
| `ASSIGNMENT_INACTIVE` | 422 | La asignación está desactivada. Reactívala antes de modificarla. |
| `ASSIGNMENT_HAS_LOGBOOK` | 409 | La asignación tiene sesiones en la bitácora: no se puede borrar ni cambiar su materia o carrera. Desactívala y crea una nueva. |
| `SCHEDULE_NOT_FOUND` | 404 | El horario no existe. |
| `SCHEDULE_OVERLAP` | 409 | El horario se empalma con otra de tus clases. Elige otra hora. |
| `SCHEDULE_RANGES_OVERLAP` | 422 | Dos rangos de horas de la captura se empalman el mismo día. Revisa las horas. |
| `TIME_RANGE_INVALID` | 422 | La hora de salida debe ser posterior a la hora de entrada. |
| `CLASS_TOO_SHORT` | 422 | La clase dura menos de lo permitido. |
| `CLASS_TOO_LONG` | 422 | La clase dura más de lo permitido. |
| `LOGBOOK_ENTRY_NOT_FOUND` | 404 | La sesión no existe en tu bitácora. |
| `SESSION_OVERLAP` | 409 | La sesión se empalma con otra sesión registrada ese día. |
| `SESSION_DATE_IN_FUTURE` | 422 | No se registran sesiones con fecha futura. |
| `SESSION_NOT_FINISHED` | 422 | La sesión todavía no termina. Regístrala después de la hora de salida. |
| `SESSION_DATE_TOO_OLD` | 422 | La sesión es demasiado antigua para registrarla o moverla a esa fecha. |
| `ASSIGNMENT_INACTIVE_ON_DATE` | 422 | La asignación no estaba activa en esa fecha. |
| `SCHEDULE_NOT_ON_DATE` | 422 | El horario elegido no corresponde al día de la semana de la fecha. |
| `PERIOD_LOCKED` | 409 | La quincena ya tiene recibo emitido: su bitácora no se puede modificar. |
| `PERIOD_IN_FUTURE` | 422 | La quincena todavía no empieza. |
| `PERIOD_NOT_FINISHED` | 422 | La quincena todavía no termina. Emite el recibo cuando concluya. |
| `PERIOD_WITHOUT_SESSIONS` | 422 | La quincena no tiene sesiones registradas: no hay nada que pagar. |
| `RECEIPT_ALREADY_ISSUED` | 409 | Ya emitiste el recibo de esta quincena. |
| `RECEIPT_NOT_FOUND` | 404 | El recibo no existe. |


## 4. Ejemplos

Las rutas se muestran sin el prefijo `/api/v1`. Todas las escrituras requieren `X-CSRF-Token`.

**Crear una asignación** (`POST /assignments`): la materia por su UUID, la carrera por su clave y la tarifa como cadena.

```json
{ "subject_id": "0b5c2f8e-1f7a-4d6e-9a43-6c1d2e3f4a5b", "career_code": "ISC", "hourly_rate": "135.00" }
```

**Cambiar la tarifa** (`PATCH /assignments/{id}`): afecta solo a las sesiones que se registren después.

```json
{ "hourly_rate": "145.00" }
```

**Registrar una sesión** (`POST /logbook`): el servidor calcula minutos y horas y congela la tarifa.

```json
{ "assignment_id": "6f1e…", "session_date": "2026-10-19", "start_time": "07:00", "end_time": "09:00", "notes": "Práctica de normalización" }
```

Respuesta (`201`), con una advertencia si no coincide con el horario:

```json
{
  "entry": { "id": "…", "minutes": 120, "hours": "2.00", "hourly_rate": "135.00", "is_locked": false, "matches_schedule": true, "…": "…" },
  "warnings": []
}
```

**Registro rápido** (`POST /logbook/quick`): las clases del horario de ese día, con las horas del horario salvo que se indiquen otras. Todo o nada.

```json
{ "session_date": "2026-10-19", "entries": [{ "schedule_id": "1a2b…" }, { "schedule_id": "2b3c…", "end_time": "12:50" }] }
```

**Vista previa** (`GET /payroll/preview?year=2026&month=10&fortnight=1`) y **emisión** (`POST /payroll/receipts` con `{ "year": 2026, "month": 10, "fortnight": 1 }`): la emisión devuelve el recibo con folio (`NOM-202610-Q1-000042`), y sus totales coinciden exactamente con la vista previa.
