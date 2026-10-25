from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.security.passwords import PasswordHasher


def test_hashes_with_argon2id_and_verifies() -> None:
    hasher = PasswordHasher()
    hashed = hasher.hash("Cuaderno-Azul-2026")

    assert hashed.startswith("$argon2id$")
    assert hasher.verify_and_update("Cuaderno-Azul-2026", hashed) == (True, None)
    assert hasher.verify_and_update("otra", hashed)[0] is False


def test_outdated_parameters_produce_a_new_hash() -> None:
    weak = PasswordHash((Argon2Hasher(time_cost=1, memory_cost=8192, parallelism=1),))
    outdated = weak.hash("Cuaderno-Azul-2026")

    valid, updated = PasswordHasher().verify_and_update("Cuaderno-Azul-2026", outdated)

    assert valid is True
    assert updated is not None
    assert updated != outdated
