#!/usr/bin/env bash
# Carga la cuenta de demostración (solo desarrollo): un docente ficticio con materias,
# asignaciones en varias carreras y tarifas, horario semanal, bitácora de varias quincenas
# y recibos emitidos. Todo pasa por los servicios del sistema, con sus validaciones.
# Es idempotente: si ya existe, solo agrega lo que falte. Se niega a correr si APP_ENV no
# es development.
#
# Uso: scripts/demo-data.sh        (requiere migraciones y datos semilla aplicados)

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

extend_path_with_known_tools
require_command uv "Ejecuta primero scripts/setup.sh."
[[ -f "$BACKEND_ENV_FILE" ]] || fail "Falta backend/.env. Ejecuta primero scripts/setup.sh."

app_env="$(require_env_var "$BACKEND_ENV_FILE" APP_ENV)"
[[ "$app_env" == "development" ]] || fail "Los datos de demostración solo se cargan con APP_ENV=development (ahora: ${app_env})."

export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

info "Cargando datos de demostración"
(cd "$BACKEND_DIR" && uv run python -m app.demo) || fail "No se cargaron los datos de demostración."
ok "Datos de demostración listos"
