"""Exporta el esquema OpenAPI sin levantar el servidor: ``python -m app.api.export_openapi RUTA``.

Lo usa ``scripts/generate-api-types.sh`` para generar los tipos de TypeScript del frontend.
Exporta el esquema aunque la documentación interactiva esté deshabilitada (producción).
"""

import json
import sys
from pathlib import Path

from app.main import create_app


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        sys.stderr.write("Uso: python -m app.api.export_openapi RUTA_DEL_JSON\n")
        return 2
    schema = create_app().openapi()
    Path(argv[0]).write_text(
        json.dumps(schema, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
