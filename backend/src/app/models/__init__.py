"""Modelos ORM. Cada modelo nuevo se importa aquí para que Alembic lo detecte."""

from app.db.base import Base

__all__ = ["Base"]
