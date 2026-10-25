from typing import Any

import pytest

from app.core.config import Settings
from app.demo import __main__ as demo_main
from app.demo.data import DEMO_EMAIL, DEMO_PASSWORD
from app.demo.runner import DemoReport


@pytest.mark.parametrize("environment", ["test", "production"])
def test_refuses_to_run_outside_development(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    valid_settings_values: dict[str, Any],
    environment: str,
) -> None:
    values = valid_settings_values | {"app_env": environment, "auth_cookie_secure": True}
    monkeypatch.setattr(demo_main, "get_settings", lambda: Settings(_env_file=None, **values))

    assert demo_main.main() == 1

    assert "solo se cargan en desarrollo" in capsys.readouterr().err


def test_report_shows_the_demo_credentials() -> None:
    report = DemoReport(account_created=True, subjects=6, sessions=78, receipts=["NOM-1"])

    text = demo_main.format_report(report)

    assert DEMO_EMAIL in text
    assert DEMO_PASSWORD in text
    assert "6 materias" in text
    assert "NOM-1" in text
