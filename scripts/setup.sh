#!/usr/bin/env bash
# Prepara el entorno local: crea los archivos .env que falten e instala las dependencias
# del backend (uv) y del frontend (npm). Es idempotente: nunca sobrescribe un .env existente.
#
# Uso: scripts/setup.sh

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

extend_path_with_known_tools
require_command uv "Instálalo desde https://docs.astral.sh/uv/getting-started/installation/"
require_command npm "Instala Node.js (versión indicada en frontend/.nvmrc)."

create_backend_env() {
  if [[ -f "$BACKEND_ENV_FILE" ]]; then
    ok "backend/.env ya existe; no se modifica"
    return
  fi
  local secret
  secret="$(generate_secret)"
  sed -e "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" \
    -e "s|^DB_PASSWORD=.*|DB_PASSWORD=PENDIENTE-escribe-aqui-la-contrasena-de-postgres|" \
    "${BACKEND_DIR}/.env.example" >"$BACKEND_ENV_FILE"
  ok "backend/.env creado con un JWT_SECRET aleatorio"
  warn "Escribe la contraseña de PostgreSQL en DB_PASSWORD (backend/.env)"
}

create_frontend_env() {
  if [[ -f "$FRONTEND_ENV_FILE" ]]; then
    ok "frontend/.env.local ya existe; no se modifica"
    return
  fi
  cp "${FRONTEND_DIR}/.env.example" "$FRONTEND_ENV_FILE"
  ok "frontend/.env.local creado"
}

info "Archivos de entorno"
create_backend_env
create_frontend_env

info "Dependencias del backend (uv sync)"
(cd "$BACKEND_DIR" && uv sync)
ok "Backend listo"

info "Dependencias del frontend (npm ci)"
(cd "$FRONTEND_DIR" && npm ci)
ok "Frontend listo"

info "Siguiente paso: scripts/create-databases.sh y después scripts/dev.sh"
