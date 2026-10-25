import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.constants import JWT_AUDIENCE
from app.core.security.tokens import (
    AccessTokenClaims,
    AccessTokenCodec,
    ExpiredTokenError,
    InvalidTokenError,
    hash_opaque_token,
    new_opaque_token,
    tokens_match,
)

SECRET = "s" * 48
CLAIMS = AccessTokenClaims(uuid.uuid4(), uuid.uuid4())


@pytest.fixture
def codec() -> AccessTokenCodec:
    return AccessTokenCodec(SECRET, "HS256", timedelta(minutes=15))


def _payload(codec: AccessTokenCodec) -> dict[str, object]:
    token = codec.encode(CLAIMS, datetime.now(UTC)).value
    payload: dict[str, object] = jwt.decode(
        token, SECRET, algorithms=["HS256"], audience=JWT_AUDIENCE
    )
    return payload


def test_round_trip(codec: AccessTokenCodec) -> None:
    issued = codec.encode(CLAIMS, datetime.now(UTC))

    assert codec.decode(issued.value) == CLAIMS


def test_expired_token(codec: AccessTokenCodec) -> None:
    issued = codec.encode(CLAIMS, datetime.now(UTC) - timedelta(minutes=16))

    with pytest.raises(ExpiredTokenError):
        codec.decode(issued.value)


def test_token_signed_with_another_secret(codec: AccessTokenCodec) -> None:
    forged = AccessTokenCodec("o" * 48, "HS256", timedelta(minutes=15))

    with pytest.raises(InvalidTokenError):
        codec.decode(forged.encode(CLAIMS, datetime.now(UTC)).value)


def test_unsigned_token_is_rejected(codec: AccessTokenCodec) -> None:
    """Un token con ``"alg": "none"`` nunca se acepta."""
    unsigned = jwt.encode(_payload(codec), key=None, algorithm="none")

    with pytest.raises(InvalidTokenError):
        codec.decode(unsigned)


@pytest.mark.parametrize(("claim", "value"), [("typ", "refresh"), ("aud", "otra-api")])
def test_token_for_another_purpose_is_rejected(
    codec: AccessTokenCodec, claim: str, value: str
) -> None:
    payload = _payload(codec) | {claim: value}

    with pytest.raises(InvalidTokenError):
        codec.decode(jwt.encode(payload, SECRET, algorithm="HS256"))


def test_opaque_tokens_are_random_and_hashed() -> None:
    first, second = new_opaque_token(), new_opaque_token()

    assert first != second
    assert len(hash_opaque_token(first)) == 64
    assert hash_opaque_token(first) == hash_opaque_token(first)


def test_tokens_match() -> None:
    assert tokens_match("abc", "abc")
    assert not tokens_match("abc", "abd")
