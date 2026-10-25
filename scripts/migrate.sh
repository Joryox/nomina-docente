#!/usr/bin/env bash
# Aplica las migraciones de Alembic a la base de desarrollo (DB_NAME de backend/.env).
# Sin argumentos ejecuta `alembic upgrade head`; con argumentos los pasa tal cual a Alembic.
# Es idempotente: si la base ya está en la última versión, no hace nada.
#
# Uso: scripts/migrate.sh                  (aplica todas las migraciones pendientes)
#      scripts/migrate.sh downgrade base   (revierte todas)
#      scripts/migrate.sh current          (muestra la versión aplicada)

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

extend_path_with_known_tools
require_command uv "Ejecuta primero scripts/setup.sh."
[[ -f "$BACKEND_ENV_FILE" ]] || fail "Falta backend/.env. Ejecuta primero scripts/setup.sh."

export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

if [[ $# -eq 0 ]]; then
  set -- upgrade head
fi

info "Alembic: $*"
(cd "$BACKEND_DIR" && uv run alembic "$@") || fail "Falló la migración. Revisa el mensaje anterior."
ok "Migraciones listas"
