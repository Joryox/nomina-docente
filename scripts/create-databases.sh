#!/usr/bin/env bash
# Crea las bases de datos de desarrollo y de pruebas si no existen.
# Lee la conexión de backend/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME,
# DB_NAME_TEST). Es idempotente: si una base ya existe, no la toca.
#
# Las extensiones (btree_gist, unaccent) no se crean aquí: las crea la migración inicial
# de Alembic, que es la fuente de verdad del esquema (scripts/migrate.sh).
#
# Uso: scripts/create-databases.sh

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

PASSWORD_PLACEHOLDER_PATTERN='^(PENDIENTE|cambia-esta-contrasena)'
DATABASE_NAME_PATTERN='^[a-z_][a-z0-9_]*$'

extend_path_with_known_tools
require_command psql "Instala el cliente de PostgreSQL o agrega su carpeta bin al PATH."
[[ -f "$BACKEND_ENV_FILE" ]] || fail "No existe ${BACKEND_ENV_FILE}. Ejecuta primero scripts/setup.sh."

PGHOST="$(require_env_var "$BACKEND_ENV_FILE" DB_HOST)"
PGPORT="$(require_env_var "$BACKEND_ENV_FILE" DB_PORT)"
PGUSER="$(require_env_var "$BACKEND_ENV_FILE" DB_USER)"
PGPASSWORD="$(require_env_var "$BACKEND_ENV_FILE" DB_PASSWORD)"
DATABASES=(
  "$(require_env_var "$BACKEND_ENV_FILE" DB_NAME)"
  "$(require_env_var "$BACKEND_ENV_FILE" DB_NAME_TEST)"
)
# PGCLIENTENCODING pide al servidor sus mensajes en UTF-8; OUTPUT_CHARSET hace lo mismo con
# los textos propios de psql y libpq (en Windows, libintl usaría la página de códigos ANSI).
export PGHOST PGPORT PGUSER PGPASSWORD PGCLIENTENCODING=UTF8 OUTPUT_CHARSET=UTF-8
export PGOPTIONS="-c client_min_messages=warning"

if [[ "$PGPASSWORD" =~ $PASSWORD_PLACEHOLDER_PATTERN ]]; then
  fail "DB_PASSWORD en ${BACKEND_ENV_FILE} todavía es un marcador. Escribe la contraseña real del usuario ${PGUSER}."
fi

# Ejecuta el SQL que recibe por stdin. Las variables de psql (:'name', :"name") solo se
# interpolan en SQL leído de stdin o de un archivo, nunca en --command.
# La salida pasa por herramientas de Bash: en Windows, psql escribe bytes UTF-8 que la
# consola interpretaría con su página de códigos (850/1252) y mostraría «Â«».
run_psql() {
  local database="$1" errors status=0
  shift
  errors="$(mktemp)"
  psql --no-psqlrc --no-password --quiet --tuples-only --no-align \
    --set ON_ERROR_STOP=1 --dbname "$database" "$@" 2>"$errors" | tr -d '\r' || status=$?
  [[ -s "$errors" ]] && tr -d '\r' <"$errors" >&2
  rm -f "$errors"
  return "$status"
}

database_exists() {
  local exists
  exists="$(run_psql postgres --set name="$1" <<<"SELECT 1 FROM pg_database WHERE datname = :'name';")"
  [[ "$exists" == "1" ]]
}

create_database() {
  run_psql postgres --set name="$1" <<<"CREATE DATABASE :\"name\" ENCODING 'UTF8' TEMPLATE template0;"
}

info "Conectando a PostgreSQL en ${PGHOST}:${PGPORT} como ${PGUSER}"
run_psql postgres <<<"SELECT 1;" >/dev/null ||
  fail "No se pudo conectar. Revisa DB_HOST, DB_PORT, DB_USER y DB_PASSWORD en ${BACKEND_ENV_FILE}."
ok "Conexión correcta"

for database in "${DATABASES[@]}"; do
  [[ "$database" =~ $DATABASE_NAME_PATTERN ]] ||
    fail "Nombre de base inválido: '${database}'. Usa minúsculas, números y guion bajo."

  if database_exists "$database"; then
    ok "La base ${database} ya existe"
  else
    create_database "$database" || fail "No se pudo crear la base ${database}."
    ok "Base ${database} creada"
  fi
done

info "Bases de datos listas. Siguiente paso: scripts/migrate.sh"
