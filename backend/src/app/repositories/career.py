from app.models.career import Career
from app.repositories.base import BaseRepository


class CareerRepository(BaseRepository[Career]):
    model = Career

    def get_by_code(self, code: str) -> Career | None:
        return self._find_one(Career.code == code)
