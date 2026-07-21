"""CSV export: sites_to_csv serialization units + /api/sites/export route.

The serialization tests build Site objects directly (no DB) so they can
probe escaping edge cases -- commas, quotes, embedded newlines -- without
bending the shared seeded fixture that other tests' counts depend on.
"""

import csv
import io

from app.models.site import Site
from app.services.portfolio_service import (
    EXPORT_COLUMN_LABELS,
    EXPORT_COLUMNS,
    sites_to_csv,
)

EXPECTED_HEADER = [EXPORT_COLUMN_LABELS[c] for c in EXPORT_COLUMNS]


def _parse(csv_text: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(csv_text)))


class TestSitesToCsv:
    def test_every_export_column_has_a_label(self):
        # Guards adding a column to EXPORT_COLUMNS without a display label
        # (which would KeyError at request time) and orphaning labels for
        # columns that no longer exist.
        assert set(EXPORT_COLUMN_LABELS) == set(EXPORT_COLUMNS)

    def test_header_row_is_the_human_readable_labels(self):
        # The header uses UI vocabulary ("Local Government Area"), not the
        # model's attribute names ("lga_name") -- snake_case headers read as
        # raw/unclean data to spreadsheet users, which is the misreading
        # that motivated the labels.
        rows = _parse(sites_to_csv([]))
        assert rows == [EXPECTED_HEADER]
        assert "lga_name" not in rows[0]
        assert "Local Government Area" in rows[0]

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
        assert row["Project"] == 'Boorara / Horizon, Stage 2 "North"'
        assert row["Site Title"] == "Line one\nline two"

    def test_none_fields_serialize_as_empty_strings(self):
        rows = _parse(sites_to_csv([Site(site_code="S001")]))
        row = dict(zip(rows[0], rows[1]))
        assert row["Site Code"] == "S001"
        assert row["Stage"] == ""
        assert row["Longitude"] == ""

    def test_formula_leading_text_cells_are_neutralized(self):
        # CSV injection (sprint-review R1): a text value starting with =,
        # +, -, @, tab, or CR executes as a formula when the export is
        # opened in Excel/LibreOffice. No current value triggers this --
        # the guard exists for the first dataset refresh that does.
        site = Site(
            site_code="S001",
            title="=HYPERLINK(\"http://evil.example\",\"click\")",
            project_title="@SUM(A1:A9)",
            short_title="+61 8 9222",
            stage="-Not A Stage",
            subtype="\t=1+2",
        )
        rows = _parse(sites_to_csv([site]))
        row = dict(zip(rows[0], rows[1]))
        assert row["Site Title"].startswith("'=")
        assert row["Project"] == "'@SUM(A1:A9)"
        assert row["Short Title"] == "'+61 8 9222"
        assert row["Stage"] == "'-Not A Stage"
        assert row["Subtype"] == "'\t=1+2"

    def test_formula_guard_leaves_ordinary_text_and_floats_alone(self):
        # The guard must only touch str cells that start with a trigger:
        # negative coordinates are floats (every southern-hemisphere
        # latitude starts with "-"), and prefixing those would corrupt
        # the whole export in the name of protecting it.
        site = Site(
            site_code="S001",
            title="Alpha Mine",
            longitude=121.5,
            latitude=-33.86,
        )
        rows = _parse(sites_to_csv([site]))
        row = dict(zip(rows[0], rows[1]))
        assert row["Site Title"] == "Alpha Mine"
        assert row["Longitude"] == "121.5"
        assert row["Latitude"] == "-33.86"


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

    def test_response_is_not_cacheable(self, client):
        # Without this, a browser (or intermediary) could serve a stale
        # cached response for an identical request URL even after the
        # underlying data changed server-side -- e.g. after a re-seed.
        res = client.get("/api/sites/export")
        assert res.headers["cache-control"] == "no-store"

    def test_full_unfiltered_export_has_all_rows(self, client):
        res = client.get("/api/sites/export")
        rows = _parse(res.text.lstrip("\ufeff"))
        assert rows[0] == EXPECTED_HEADER
        assert len(rows) == 1 + 5  # header + all seeded sites

    def test_filters_apply_to_the_export(self, client):
        res = client.get("/api/sites/export", params={"stage": "Proposed"})
        rows = _parse(res.text.lstrip("\ufeff"))
        assert len(rows) == 1 + 1
        assert rows[1][0] == "S003"

    def test_sort_applies_to_the_export(self, client):
        res = client.get("/api/sites/export", params={"sort": "-title"})
        rows = _parse(res.text.lstrip("\ufeff"))
        titles = [dict(zip(rows[0], r))["Site Title"] for r in rows[1:]]
        assert titles == sorted(titles, reverse=True)

    def test_invalid_sort_returns_422_not_a_csv(self, client):
        res = client.get("/api/sites/export", params={"sort": "bogus_field"})
        assert res.status_code == 422
        assert "bogus_field" in res.json()["detail"]
