import uuid

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, normalized_email: str) -> User | None:
        """Recibe el correo ya normalizado (RN-02); la base solo guarda esa forma."""
        return self._find_one(User.email == normalized_email)

    def get_by_public_id(self, public_id: uuid.UUID) -> User | None:
        return self._find_one(User.public_id == public_id)
