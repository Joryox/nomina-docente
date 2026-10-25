"""Hash de contraseñas con Argon2id (pwdlib)."""

from functools import lru_cache

from pwdlib import PasswordHash


class PasswordHasher:
    """Envuelve pwdlib para que el resto del sistema no dependa de la biblioteca.

    ``verify_dummy`` compara contra un hash fijo: el inicio de sesión lo usa cuando el
    correo no existe, para que la respuesta tarde lo mismo que con un correo registrado.
    """

    def __init__(self, password_hash: PasswordHash | None = None) -> None:
        # recommended() = Argon2id con los parámetros vigentes de pwdlib.
        self._password_hash = password_hash or PasswordHash.recommended()
        self._dummy_hash = self._password_hash.hash("contraseña-ficticia-para-igualar-tiempos")

    def hash(self, password: str) -> str:
        return self._password_hash.hash(password)

    def verify_and_update(self, password: str, password_hash: str) -> tuple[bool, str | None]:
        """Devuelve si coincide y, si el hash usa parámetros antiguos, el hash nuevo."""
        return self._password_hash.verify_and_update(password, password_hash)

    def verify_dummy(self, password: str) -> None:
        self._password_hash.verify(password, self._dummy_hash)


@lru_cache
def get_password_hasher() -> PasswordHasher:
    return PasswordHasher()
