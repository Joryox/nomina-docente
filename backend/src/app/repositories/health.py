"""Acceso a datos para la verificación de salud."""

from sqlalchemy import text
from sqlalchemy.orm import Session


class HealthRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def ping(self) -> None:
        """Ejecuta una consulta mínima; lanza una excepción si la base no responde."""
        self._session.execute(text("SELECT 1"))
