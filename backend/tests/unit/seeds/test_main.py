from collections import Counter

from app.seeds.__main__ import format_report
from app.seeds.runner import CatalogReport, SeedOutcome


def test_report_lists_every_catalog_with_its_counts() -> None:
    reports = [
        CatalogReport("roles", Counter({SeedOutcome.UNCHANGED: 2})),
        CatalogReport("careers", Counter({SeedOutcome.INSERTED: 1, SeedOutcome.UPDATED: 2})),
    ]

    assert format_report(reports) == (
        "Datos semilla aplicados:\n"
        "  roles    0 nuevos, 0 actualizados, 2 sin cambios\n"
        "  careers  1 nuevos, 2 actualizados, 0 sin cambios\n"
    )
