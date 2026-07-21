"""Seed-time dataset-shape warnings (_dataset_shape_warnings).

First direct coverage of anything in app.db.seed. The function is a pure
list-of-Sites -> list-of-strings check, so these tests build Site objects
in memory -- no database, no CSV file. The hard failure paths
(_validate_rows' row floor and duplicate detection) stay untested here on
purpose: they abort the seed loudly, so a regression is self-announcing,
whereas a silently-vanished *warning* is exactly the failure mode this
file exists to prevent.
"""

from app.db.seed import (
    MAP_PAGE_SIZE,
    RELATED_FETCH_SIZE,
    _dataset_shape_warnings,
)
from app.models.site import Site


def _sites(count: int, project_code: str = "P01", **overrides) -> list[Site]:
    return [
        Site(
            site_code=f"S{i:04d}",
            project_code=project_code,
            project_title=f"{project_code} Project",
            **overrides,
        )
        for i in range(count)
    ]


def _spread_sites(total: int) -> list[Site]:
    # `total` rows spread across many small projects (<= 50 sites each),
    # so row-count tests don't accidentally also trip the per-project cap
    # -- one warning condition per test, not two tangled together.
    rows: list[Site] = []
    for i in range(total):
        code = f"P{i // 50:03d}"
        rows.append(
            Site(
                site_code=f"S{i:05d}",
                project_code=code,
                project_title=f"{code} Project",
            )
        )
    return rows


def test_current_dataset_shape_produces_no_warnings():
    # A handful of small, consistently-titled projects -- the shape the
    # real 421-row snapshot has. Anything warned here would be noise on
    # every legitimate seed, which is how warnings get ignored.
    rows = _sites(3, "P01") + _sites(2, "P02") + _sites(1, "P03")
    assert _dataset_shape_warnings(rows) == []


def test_warns_when_rows_exceed_map_page_size():
    rows = _spread_sites(MAP_PAGE_SIZE + 1)
    warnings = _dataset_shape_warnings(rows)
    assert len(warnings) == 1
    assert "MAP_PAGE_SIZE" in warnings[0]
    assert str(MAP_PAGE_SIZE + 1) in warnings[0]
    assert "map" in warnings[0]


def test_no_warning_at_exactly_the_map_cap():
    # The cap is a page *size*: exactly 500 rows still fit in one fetch,
    # so warning there would cry wolf one row early.
    assert _dataset_shape_warnings(_spread_sites(MAP_PAGE_SIZE)) == []


def test_warns_when_a_project_exceeds_related_fetch_size():
    # One oversized project among normal ones: the warning must name the
    # offending project code, not just say "something is too big".
    rows = _sites(RELATED_FETCH_SIZE + 1, "PBIG") + _sites(2, "P01")
    warnings = _dataset_shape_warnings(rows)
    assert len(warnings) == 1
    assert "PBIG" in warnings[0]
    assert "RELATED_FETCH_SIZE" in warnings[0]


def test_warns_on_project_title_drift_within_one_code():
    # top_projects groups by (project_code, project_title); two spellings
    # of one project's title would split it into two undercounted rows.
    rows = _sites(2, "P01")
    rows[1].project_title = "P01 Project (Stage 2)"
    warnings = _dataset_shape_warnings(rows)
    assert len(warnings) == 1
    assert "P01" in warnings[0]
    assert "'P01 Project'" in warnings[0]
    assert "'P01 Project (Stage 2)'" in warnings[0]


def test_null_project_codes_and_titles_are_not_drift():
    # NULL project_code rows can't drift (nothing to group under), and a
    # NULL title next to a real one is missing data, not two spellings.
    rows = _sites(2, "P01")
    rows += [Site(site_code="SX001"), Site(site_code="SX002")]
    with_null_title = Site(site_code="SX003", project_code="P01")
    rows.append(with_null_title)
    assert _dataset_shape_warnings(rows) == []


def test_multiple_problems_produce_multiple_warnings():
    # Warnings accumulate rather than short-circuiting: a refresh that
    # breaks two assumptions should say so once, not reveal them one
    # seed run at a time.
    rows = _sites(RELATED_FETCH_SIZE + 1, "PBIG") + _sites(2, "P01")
    rows[-1].project_title = "Different Spelling"
    warnings = _dataset_shape_warnings(rows)
    assert len(warnings) == 2
    assert any("PBIG" in w for w in warnings)
    assert any("Different Spelling" in w for w in warnings)
