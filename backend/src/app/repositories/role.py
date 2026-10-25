from app.models.role import Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    model = Role

    def get_by_code(self, code: str) -> Role | None:
        return self._find_one(Role.code == code)
