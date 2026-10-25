"""Errores de acceso a datos que los servicios pueden interpretar sin conocer SQLAlchemy."""


class ConstraintViolationError(Exception):
    """La base rechazó la escritura por una restricción (``UNIQUE``, ``CHECK``, FK…).

    ``constraint`` es el nombre de la restricción según la convención del esquema: el
    servicio lo traduce a un error de dominio con un mensaje claro.
    """

    def __init__(self, constraint: str | None) -> None:
        self.constraint = constraint
        super().__init__(f"Restricción violada: {constraint}")
