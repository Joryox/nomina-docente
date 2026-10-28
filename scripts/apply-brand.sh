#!/usr/bin/env bash
# Aplica los logos y el color institucional en un solo paso y verifica el contraste.
#
#   bash scripts/apply-brand.sh <carpeta-con-logos> <color-hex>
#   bash scripts/apply-brand.sh ~/Descargas/logos-tesh "#8A1538"
#
# La carpeta debe tener logo.svg y, si existen, logo-monochrome.svg y favicon.svg.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

if [ "$#" -ne 2 ]; then
  fail "Uso: bash scripts/apply-brand.sh <carpeta-con-logos> <color-hex>"
fi

extend_path_with_known_tools
require_command node "Instala Node.js 24 LTS (ver frontend/.nvmrc)."

info "Aplicando la identidad institucional"
node "$SCRIPT_DIR/lib/apply-brand.mjs" "$1" "$2"

info "Verificando contraste (WCAG AA) y valores del sistema de diseño"
(cd "$FRONTEND_DIR" && npm test --silent)
ok "Marca aplicada. Revisa la guía viva (bash scripts/dev.sh → /sistema-diseno) en ambos modos."
