import pytest

from app.core.security.audit import SecurityEvent, email_fingerprint, log_security_event


def test_fingerprint_is_stable_and_does_not_reveal_the_email() -> None:
    fingerprint = email_fingerprint("ana.garcia@tesh.edu.mx")

    assert fingerprint == email_fingerprint("ana.garcia@tesh.edu.mx")
    assert "ana" not in fingerprint
    assert len(fingerprint) == 16


def test_failures_are_logged_as_warnings(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level("INFO", logger="app.security"):
        log_security_event(SecurityEvent.ACCOUNT_LOCKED, user_id="u-1")
        log_security_event(SecurityEvent.LOGIN_SUCCEEDED, user_id="u-1")

    assert [record.levelname for record in caplog.records] == ["WARNING", "INFO"]
    assert caplog.records[0].__dict__["security_event"] == "account_locked"
    assert "client_ip" not in caplog.records[0].__dict__
