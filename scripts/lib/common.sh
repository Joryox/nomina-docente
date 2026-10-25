# Funciones compartidas por los scripts de desarrollo. Se carga con `source`.
# Compatible con Bash en Linux y con Git Bash en Windows.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
FRONTEND_DIR="${REPO_ROOT}/frontend"
BACKEND_ENV_FILE="${BACKEND_DIR}/.env"
FRONTEND_ENV_FILE="${FRONTEND_DIR}/.env.local"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  !\033[0m %s\n' "$*" >&2; }
fail() {
  printf '\033[1;31mError:\033[0m %s\n' "$*" >&2
  exit 1
}

is_windows() {
  case "$(uname -s)" in
    MINGW* | MSYS* | CYGWIN*) return 0 ;;
    *) return 1 ;;
  esac
}

# Lee una variable de un archivo .env sin ejecutarlo (no se usa `source` a propósito).
# Quita comillas envolventes y espacios. Uso: read_env_var ARCHIVO NOMBRE
read_env_var() {
  local file="$1" name="$2" line value
  line="$(grep -E "^[[:space:]]*${name}=" "$file" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 1
  value="${line#*=}"
  value="${value%$'\r'}"
  value="$(printf '%s' "$value" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then
    value="${BASH_REMATCH[1]}"
  fi
  printf '%s' "$value"
}

require_env_var() {
  local file="$1" name="$2" value
  value="$(read_env_var "$file" "$name")" || fail "Falta ${name} en ${file}."
  [[ -n "$value" ]] || fail "${name} está vacía en ${file}."
  printf '%s' "$value"
}

# Agrega herramientas instaladas en rutas conocidas que quizá no estén en el PATH de la
# terminal actual (por ejemplo, justo después de instalarlas en Windows).
extend_path_with_known_tools() {
  local candidate
  for candidate in "${HOME}/.local/bin" "${HOME}/.cargo/bin"; do
    [[ -d "$candidate" ]] && PATH="${candidate}:${PATH}"
  done
  if is_windows; then
    for candidate in "/c/Program Files/PostgreSQL"/*/bin "/c/Program Files/nodejs"; do
      [[ -d "$candidate" ]] && PATH="${PATH}:${candidate}"
    done
  fi
  export PATH
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "No se encontró '$1'. $2"
}

generate_secret() {
  if command -v python3 >/dev/null 2>&1 && python3 -c "" >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_urlsafe(48))"
  elif command -v python >/dev/null 2>&1; then
    python -c "import secrets; print(secrets.token_urlsafe(48))"
  elif command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-64
  else
    fail "Se necesita python u openssl para generar JWT_SECRET."
  fi
}
