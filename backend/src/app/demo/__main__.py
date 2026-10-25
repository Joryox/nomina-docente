"""Comando de datos de demostración: ``python -m app.demo`` (o ``scripts/demo-data.sh``).

Se niega a correr fuera de desarrollo (``APP_ENV=development``): crea una cuenta con
contraseña conocida y datos ficticios que nunca deben existir en un entorno real.
"""

import sys

from sqlalchemy.exc import SQLAlchemyError

from app.core.clock import BusinessCalendar, utc_now
from app.core.config import ConfigurationError, Environment, get_settings
from app.core.exceptions import DomainError
from app.db.session import get_session_factory
from app.demo import data
from app.demo.runner import DemoDataError, DemoLoader, DemoReport


def format_report(report: DemoReport) -> str:
    receipts = ", ".join(report.receipts) if report.receipts else "ninguno nuevo"
    lines = [
        "Datos de demostración listos.",
        f"  Cuenta: {'creada' if report.account_created else 'ya existía'}",
        f"  Nuevos: {report.subjects} materias, {report.assignments} asignaciones, "
        f"{report.schedules} horarios, {report.sessions} sesiones",
        f"  Recibos emitidos ahora: {receipts}",
        "",
        "Inicia sesión en el sistema con:",
        f"  Correo:     {data.DEMO_EMAIL}",
        f"  Contraseña: {data.DEMO_PASSWORD}",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    try:
        settings = get_settings()
    except ConfigurationError as error:
        sys.stderr.write(f"{error}\n")
        return 1
    if settings.app_env is not Environment.DEVELOPMENT:
        sys.stderr.write(
            "Los datos de demostración solo se cargan en desarrollo "
            f"(APP_ENV=development; ahora es {settings.app_env.value}).\n"
        )
        return 1
    today = BusinessCalendar(utc_now).today()
    try:
        with get_session_factory()() as session:
            report = DemoLoader(session, settings, today).run()
    except (DemoDataError, DomainError) as error:
        sys.stderr.write(f"No se cargaron los datos de demostración: {error}\n")
        return 1
    except SQLAlchemyError as error:
        cause = str(getattr(error, "orig", None) or error).strip().splitlines()[0]
        sys.stderr.write(
            f"No se pudo conectar o escribir en la base: {cause}\n"
            "Verifica las migraciones (scripts/migrate.sh) y los catálogos (scripts/seed.sh).\n"
        )
        return 1
    sys.stdout.write(format_report(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
