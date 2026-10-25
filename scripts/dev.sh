#!/usr/bin/env bash
# Levanta el backend (FastAPI) y el frontend (Next.js) en modo desarrollo con un solo
# comando. Ctrl+C detiene ambos.
#
# Uso: scripts/dev.sh

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

extend_path_with_known_tools
require_command uv "Ejecuta primero scripts/setup.sh."
require_command npm "Ejecuta primero scripts/setup.sh."
[[ -f "$BACKEND_ENV_FILE" ]] || fail "Falta backend/.env. Ejecuta primero scripts/setup.sh."
[[ -f "$FRONTEND_ENV_FILE" ]] || fail "Falta frontend/.env.local. Ejecuta primero scripts/setup.sh."

API_HOST="$(require_env_var "$BACKEND_ENV_FILE" API_HOST)"
API_PORT="$(require_env_var "$BACKEND_ENV_FILE" API_PORT)"
DEV_SERVER_PORT="$(require_env_var "$FRONTEND_ENV_FILE" DEV_SERVER_PORT)"

# Salida en UTF-8 en la consola de Windows (acentos en los mensajes del backend).
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

PIDS=()
STOPPED=false

stop_process_tree() {
  local pid="$1" winpid
  if is_windows && [[ -r "/proc/${pid}/winpid" ]]; then
    winpid="$(cat "/proc/${pid}/winpid")"
    taskkill //F //T //PID "$winpid" >/dev/null 2>&1 || true
  else
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  [[ "$STOPPED" == true ]] && return
  STOPPED=true
  printf '\n'
  info "Deteniendo servidores"
  for pid in "${PIDS[@]}"; do
    stop_process_tree "$pid"
  done
  wait 2>/dev/null || true
  ok "Servidores detenidos"
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

info "Iniciando backend en http://${API_HOST}:${API_PORT}"
(cd "$BACKEND_DIR" && exec uv run python -m app) &
PIDS+=("$!")

info "Iniciando frontend en http://localhost:${DEV_SERVER_PORT}"
(cd "$FRONTEND_DIR" && exec npm run dev -- --port "$DEV_SERVER_PORT") &
PIDS+=("$!")

cat <<EOF

  Frontend:          http://localhost:${DEV_SERVER_PORT}
  API (vía proxy):   http://localhost:${DEV_SERVER_PORT}/api/v1/health
  API (directa):     http://${API_HOST}:${API_PORT}/api/v1/health
  Documentación API: http://${API_HOST}:${API_PORT}/docs

  Presiona Ctrl+C para detener ambos servidores.

EOF

# Si uno de los dos termina (por ejemplo, por un error de configuración), se detienen ambos.
wait -n "${PIDS[@]}" || true
warn "Uno de los servidores terminó; deteniendo el otro"
