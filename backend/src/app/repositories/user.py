import uuid

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, normalized_email: str, *, for_update: bool = False) -> User | None:
        """Recibe el correo ya normalizado (RN-02); la base solo guarda esa forma.

        ``for_update`` bloquea la fila hasta el fin de la transacción: dos intentos de inicio
        de sesión simultáneos no pierden la cuenta de intentos fallidos.
        """
        return self._find_one(User.email == normalized_email, for_update=for_update)

    def get_by_public_id(self, public_id: uuid.UUID) -> User | None:
        return self._find_one(User.public_id == public_id)
