# Scripts de desarrollo

Utilidades para preparar y mantener el entorno local. Cada script:

- está escrito en Bash y funciona en **Windows 11 con Git Bash** (entorno principal) y en Linux;
- lee sus parámetros de `backend/.env` y `frontend/.env.local` (nunca contiene credenciales);
- es idempotente: ejecutarlo dos veces no rompe nada;
- se ejecuta desde la raíz del repositorio (`bash scripts/<script>.sh`) y se documenta aquí y en el README principal.

| Script | Descripción |
| --- | --- |
| `setup.sh` | Crea `backend/.env` (con `JWT_SECRET` aleatorio) y `frontend/.env.local` si no existen, e instala dependencias con `uv sync` y `npm ci` |
| `create-databases.sh` | Crea `DB_NAME` y `DB_NAME_TEST` (UTF-8) si no existen. Usa `DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD` de `backend/.env`. Las extensiones las crea la migración, no este script |
| `migrate.sh` | Aplica las migraciones de Alembic a `DB_NAME`. Sin argumentos ejecuta `upgrade head`; con argumentos los pasa a Alembic (`current`, `history`, `downgrade base`) |
| `seed.sh` | Carga los datos semilla de `backend/src/app/seeds/data/` (roles, tipos de carrera, carreras y tarifas): inserta lo nuevo, actualiza lo que cambió y nunca borra |
| `dev.sh` | Levanta backend y frontend juntos, muestra sus URL y detiene ambos con Ctrl+C |
| `demo-data.sh` | Carga la cuenta de demostración (`python -m app.demo`): materias, asignaciones, horarios, bitácora de varias quincenas y recibos, todo por los servicios del sistema. Se niega a correr si `APP_ENV` no es `development`; imprime el correo y la contraseña |
| `generate-api-types.sh` | Exporta el OpenAPI del backend sin levantarlo (`python -m app.api.export_openapi`) y genera `frontend/src/lib/api-types.gen.ts` con openapi-typescript. Con `--check` falla si el archivo versionado está desactualizado. También: `npm run api:types` / `npm run api:check` en `frontend/` |
| `apply-brand.sh` | Aplica los logos y el color institucional en un solo paso: `bash scripts/apply-brand.sh <carpeta-con-logos> "#8A1538"`. Copia los SVG a la interfaz y al recibo en PDF, declara los logos, genera la escala de color (`lib/apply-brand.mjs`, sin dependencias) y corre `npm test` para verificar el contraste |
| `lib/common.sh` | Funciones compartidas (lectura segura de `.env`, rutas de herramientas en Windows, mensajes) |

Orden para una base nueva: `create-databases.sh` → `migrate.sh` → `seed.sh` (→ `demo-data.sh` para presentar el sistema).

`create-databases.sh` envía el SQL a `psql` por la entrada estándar (las variables `:'name'` de psql no se interpolan con `--command`) y pide los mensajes del servidor en UTF-8 (`PGCLIENTENCODING`), para que en Windows no aparezcan como `Â«`.

En Windows, los scripts agregan por su cuenta las rutas habituales de `uv`, Node.js y PostgreSQL (`C:\Program Files\PostgreSQL\<versión>\bin`) si la terminal todavía no las tiene en el `PATH`.
