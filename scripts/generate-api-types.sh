#!/usr/bin/env bash
# Genera los tipos de TypeScript del frontend a partir del esquema OpenAPI del backend, para
# que los contratos nunca se escriban a mano ni se desincronicen. Exporta el esquema sin
# levantar el servidor y lo convierte con openapi-typescript.
#
# Uso: scripts/generate-api-types.sh          (regenera frontend/src/lib/api-types.gen.ts)
#      scripts/generate-api-types.sh --check  (falla si el archivo versionado está desactualizado)

source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

OUTPUT="${FRONTEND_DIR}/src/lib/api-types.gen.ts"
mode="${1:-write}"
[[ "$mode" == "write" || "$mode" == "--check" ]] || fail "Opción desconocida: ${mode}. Usa --check o nada."

extend_path_with_known_tools
require_command uv "Ejecuta primero scripts/setup.sh."
require_command npx "Instala Node.js 24 LTS."
[[ -f "$BACKEND_ENV_FILE" ]] || fail "Falta backend/.env. Ejecuta primero scripts/setup.sh."

export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

info "Exportando el esquema OpenAPI del backend"
(cd "$BACKEND_DIR" && uv run python -m app.api.export_openapi "${workdir}/openapi.json") \
  || fail "No se pudo exportar el esquema OpenAPI."

info "Generando los tipos de TypeScript"
(
  cd "$FRONTEND_DIR"
  npx --no-install openapi-typescript "${workdir}/openapi.json" -o "${workdir}/api-types.gen.ts" --silent
  npx --no-install prettier --stdin-filepath "$OUTPUT" < "${workdir}/api-types.gen.ts" > "${workdir}/formatted.ts"
) || fail "No se pudieron generar los tipos."

if [[ "$mode" == "--check" ]]; then
  cmp -s "${workdir}/formatted.ts" "$OUTPUT" \
    || fail "Los tipos de la API están desactualizados. Ejecuta scripts/generate-api-types.sh."
  ok "Los tipos de la API están al día"
else
  mv "${workdir}/formatted.ts" "$OUTPUT"
  ok "Tipos generados en frontend/src/lib/api-types.gen.ts"
fi
