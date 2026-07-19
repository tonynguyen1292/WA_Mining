"""CSV export: sites_to_csv serialization units + /api/sites/export route.

The serialization tests build Site objects directly (no DB) so they can
probe escaping edge cases -- commas, quotes, embedded newlines -- without
bending the shared seeded fixture that other tests' counts depend on.
"""

import csv
import io

from app.models.site import Site
from app.services.portfolio_service import EXPORT_COLUMNS, sites_to_csv


def _parse(csv_text: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(csv_text)))


class TestSitesToCsv:
    def test_header_row_matches_export_columns(self):
        rows = _parse(sites_to_csv([]))
        assert rows == [EXPORT_COLUMNS]

    def test_one_row_per_site_in_given_order(self):
        sites = [
            Site(site_code="S002", title="Beta"),
            Site(site_code="S001", title="Alpha"),
        ]
        rows = _parse(sites_to_csv(sites))
        # sites_to_csv serializes exactly what it's given -- ordering is the
        # query's job (list_sites_for_export), not the serializer's.
        assert [r[0] for r in rows[1:]] == ["S002", "S001"]

    def test_comma_quote_and_newline_fields_round_trip(self):
        site = Site(
            site_code="S001",
            project_title='Boorara / Horizon, Stage 2 "North"',
            title="Line one\nline two",
        )
        rows = _parse(sites_to_csv([site]))
        row = dict(zip(rows[0], rows[1]))
        assert row["project_title"] == 'Boorara / Horizon, Stage 2 "North"'
        assert row["title"] == "Line one\nline two"

    def test_none_fields_serialize_as_empty_strings(self):
        rows = _parse(sites_to_csv([Site(site_code="S001")]))
        row = dict(zip(rows[0], rows[1]))
        assert row["site_code"] == "S001"
        assert row["stage"] == ""
        assert row["longitude"] == ""


class TestExportRoute:
    def test_export_is_not_captured_by_the_site_code_path_param(self, client):
        # Route-ordering regression guard: /export is registered before
        # /{site_code}; if that order ever flips, this comes back as a 404
        # ("Site 'export' not found") instead of a CSV.
        res = client.get("/api/sites/export")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/csv")

    def test_download_headers_and_bom(self, client):
        res = client.get("/api/sites/export")
        assert res.headers["content-disposition"] == 'attachment; filename="wa_mining_sites.csv"'
        assert res.text.startswith("\ufeff")

    def test_full_unfiltered_export_has_all_rows(self, client):
        res = client.get("/api/sites/export")
        rows = _parse(res.text.lstrip("\ufeff"))
        assert rows[0] == EXPORT_COLUMNS
        assert len(rows) == 1 + 5  # header + all seeded sites

    def test_filters_apply_to_the_export(self, client):
        res = client.get("/api/sites/export", params={"stage": "Proposed"})
        rows = _parse(res.text.lstrip("\ufeff"))
        assert len(rows) == 1 + 1
        assert rows[1][0] == "S003"

    def test_sort_applies_to_the_export(self, client):
        res = client.get("/api/sites/export", params={"sort": "-title"})
        rows = _parse(res.text.lstrip("\ufeff"))
        titles = [dict(zip(rows[0], r))["title"] for r in rows[1:]]
        assert titles == sorted(titles, reverse=True)

    def test_invalid_sort_returns_422_not_a_csv(self, client):
        res = client.get("/api/sites/export", params={"sort": "bogus_field"})
        assert res.status_code == 422
        assert "bogus_field" in res.json()["detail"]
