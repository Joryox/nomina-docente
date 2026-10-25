"""Comando de carga de datos semilla: ``python -m app.seeds`` (o ``scripts/seed.sh``).

Carga todo en una sola transacción: si algo falla, la base queda como estaba.
"""

import sys

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import ConfigurationError
from app.db.session import get_session_factory
from app.seeds.loader import SeedDataError
from app.seeds.runner import CatalogReport, SeedOutcome, run_seeds

MIGRATIONS_HINT = (
    "Verifica que la base exista y tenga las migraciones aplicadas (scripts/migrate.sh)."
)


def format_report(reports: list[CatalogReport]) -> str:
    width = max(len(report.catalog) for report in reports)
    lines = [
        f"  {report.catalog:<{width}}  "
        f"{report.counts[SeedOutcome.INSERTED]} nuevos, "
        f"{report.counts[SeedOutcome.UPDATED]} actualizados, "
        f"{report.counts[SeedOutcome.UNCHANGED]} sin cambios"
        for report in reports
    ]
    return "\n".join(["Datos semilla aplicados:", *lines]) + "\n"


def main() -> int:
    try:
        with get_session_factory()() as session:
            reports = run_seeds(session)
            session.commit()
    except (ConfigurationError, SeedDataError) as error:
        sys.stderr.write(f"{error}\n")
        return 1
    except SQLAlchemyError as error:
        cause = str(getattr(error, "orig", None) or error).strip().splitlines()[0]
        sys.stderr.write(f"No se pudieron cargar los datos semilla: {cause}\n{MIGRATIONS_HINT}\n")
        return 1
    sys.stdout.write(format_report(reports))
    return 0


if __name__ == "__main__":
    sys.exit(main())
