#!/usr/bin/env bash
# Carga los datos semilla (roles, tipos de carrera, carreras y tarifas) en la base de
# desarrollo. Es idempotente: inserta lo nuevo, actualiza lo que cambió en los archivos de
# backend/src/app/seeds/data/ y no duplica nada.
#
# Uso: scripts/seed.sh

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

extend_path_with_known_tools
require_command uv "Ejecuta primero scripts/setup.sh."
[[ -f "$BACKEND_ENV_FILE" ]] || fail "Falta backend/.env. Ejecuta primero scripts/setup.sh."

export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

info "Cargando datos semilla"
(cd "$BACKEND_DIR" && uv run python -m app.seeds) || fail "No se cargaron los datos semilla."
ok "Datos semilla listos"
