from app.models.career_type import CareerType
from app.repositories.base import BaseRepository


class CareerTypeRepository(BaseRepository[CareerType]):
    model = CareerType

    def get_by_code(self, code: str) -> CareerType | None:
        return self._find_one(CareerType.code == code)
