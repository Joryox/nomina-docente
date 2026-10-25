from datetime import timedelta

from app.models import User
from app.services.login_throttle import LoginThrottle
from tests.helpers import FakeClock


def _throttle(clock: FakeClock) -> LoginThrottle:
    return LoginThrottle(max_failed_attempts=3, lockout=timedelta(minutes=15), clock=clock)


def _user() -> User:
    return User(email="ana@tesh.edu.mx", password_hash="x", failed_login_attempts=0)


def test_locks_on_the_last_allowed_attempt() -> None:
    throttle, user = _throttle(FakeClock()), _user()

    results = [throttle.register_failure(user) for _ in range(3)]

    assert results == [False, False, True]
    assert throttle.is_locked(user)
    assert user.failed_login_attempts == 0


def test_lock_expires() -> None:
    clock = FakeClock()
    throttle, user = _throttle(clock), _user()
    for _ in range(3):
        throttle.register_failure(user)

    clock.advance(timedelta(minutes=15, seconds=1))

    assert not throttle.is_locked(user)


def test_reset_clears_the_state() -> None:
    throttle, user = _throttle(FakeClock()), _user()
    throttle.register_failure(user)

    throttle.reset(user)

    assert user.failed_login_attempts == 0
    assert user.locked_until is None
