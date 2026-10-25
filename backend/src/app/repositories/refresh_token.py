from app.models.refresh_token import RefreshToken
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    def get_by_hash_for_update(self, token_hash: str) -> RefreshToken | None:
        """Bloquea la fila: dos renovaciones simultáneas con el mismo token se atienden una
        después de otra, y la segunda ve el token ya usado."""
        return self._find_one(RefreshToken.token_hash == token_hash, for_update=True)
