#!/usr/bin/env bash
# Crea las bases de datos de desarrollo y de pruebas y habilita btree_gist en ambas.
# Lee la conexión de backend/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME,
# DB_NAME_TEST). Es idempotente: si las bases ya existen, solo verifica la extensión.
#
# Uso: scripts/create-databases.sh

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

PASSWORD_PLACEHOLDER_PATTERN='^(PENDIENTE|cambia-esta-contrasena)'
REQUIRED_EXTENSIONS=(btree_gist)

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
export PGHOST PGPORT PGUSER PGPASSWORD PGCLIENTENCODING=UTF8
export PGOPTIONS="-c client_min_messages=warning"

if [[ "$PGPASSWORD" =~ $PASSWORD_PLACEHOLDER_PATTERN ]]; then
  fail "DB_PASSWORD en ${BACKEND_ENV_FILE} todavía es un marcador. Escribe la contraseña real del usuario ${PGUSER}."
fi

run_psql() {
  local database="$1"
  shift
  psql --no-psqlrc --no-password --quiet --tuples-only --no-align \
    --set ON_ERROR_STOP=1 --dbname "$database" "$@"
}

info "Conectando a PostgreSQL en ${PGHOST}:${PGPORT} como ${PGUSER}"
run_psql postgres --command "SELECT 1" >/dev/null ||
  fail "No se pudo conectar. Revisa DB_HOST, DB_PORT, DB_USER y DB_PASSWORD en ${BACKEND_ENV_FILE}."
ok "Conexión correcta"

for database in "${DATABASES[@]}"; do
  [[ "$database" =~ ^[a-z_][a-z0-9_]*$ ]] ||
    fail "Nombre de base inválido: '${database}'. Usa minúsculas, números y guion bajo."

  exists="$(run_psql postgres --set name="$database" \
    --command "SELECT 1 FROM pg_database WHERE datname = :'name'")"
  if [[ "$exists" == "1" ]]; then
    ok "La base ${database} ya existe"
  else
    run_psql postgres --command "CREATE DATABASE \"${database}\" ENCODING 'UTF8' TEMPLATE template0"
    ok "Base ${database} creada"
  fi

  for extension in "${REQUIRED_EXTENSIONS[@]}"; do
    run_psql "$database" --command "CREATE EXTENSION IF NOT EXISTS ${extension}"
    ok "Extensión ${extension} habilitada en ${database}"
  done
done

info "Bases de datos listas"
