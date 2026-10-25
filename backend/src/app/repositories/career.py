from sqlalchemy import select

from app.models.career import Career
from app.repositories.base import BaseRepository


class CareerRepository(BaseRepository[Career]):
    model = Career

    def get_by_code(self, code: str) -> Career | None:
        return self._find_one(Career.code == code)

    def list_active(self, *, offset: int, limit: int) -> tuple[list[Career], int]:
        """Carreras para los selectores (RN-07: las inactivas no aparecen)."""
        statement = select(Career).where(Career.is_active).order_by(Career.name)
        return self._paginate(statement, offset=offset, limit=limit)
