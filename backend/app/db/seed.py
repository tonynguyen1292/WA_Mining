"""Seed the `sites` table from the pre-cleaned MINEDEX snapshot.

Loads DATABASES/Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv --
the output of actually running SQL/01_create_raw_table.sql through
SQL/05_portfolio_summary.sql against the raw CSV, not a from-scratch
reimplementation of that cleaning in Python. Earlier versions of this file
read the raw CSV directly and ported the SQL's TRIM/INITCAP/suffix-handling
logic into Python by hand -- functionally correct (verified byte-for-byte
identical, row by row, against a real run of the SQL pipeline before this
file changed), but it meant the same cleaning rules were maintained in two
places that could silently drift apart. Now there is exactly one
implementation of the cleaning rules (the SQL pipeline); this file's job is
just loading its already-clean output.

To regenerate DATABASES/Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv
from a fresh raw CSV: run SQL/01 through SQL/05 (see SQL/run_all.sql) against
any Postgres database, then, via psql, run the meta-command:
    copy sites TO 'DATABASES/Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv' WITH (FORMAT csv, HEADER true)
(prefixed with a backslash at the psql prompt -- omitted above so this
docstring doesn't trip Python's invalid-escape-sequence warning). Column
ordering doesn't need to match this file's Site(...) construction below,
since rows are read by column name via csv.DictReader, not position.

Usage (from backend/, with DATABASE_URL configured):
    python -m app.db.seed
"""

import csv
from collections import Counter
from pathlib import Path

from sqlalchemy import delete, func, select

from app.core.database import Base, SessionLocal, engine
from app.models.site import Site

MIN_EXPECTED_ROWS = 100  # sanity floor; the known-good snapshot has 421

# Mirrors of frontend constants whose values quietly assume the current
# dataset shape (~421 rows, largest project 5 sites). If a refreshed
# snapshot crosses either cap, the UI doesn't error -- it silently
# truncates (map pins / related-sites lists) -- so the seed step is where
# the crossing gets said out loud. Keep in sync with:
#   frontend/src/pages/MapPage.tsx        MAP_PAGE_SIZE
#   frontend/src/pages/SiteDetailPage.tsx RELATED_FETCH_SIZE
MAP_PAGE_SIZE = 500
RELATED_FETCH_SIZE = 100

# backend/app/db/seed.py -> backend/app -> backend -> repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
CSV_PATH = REPO_ROOT / "DATABASES" / "Cleaned_Mining_Data" / "Major_Resource_Projects_Cleaned.csv"

# Text columns read verbatim (already cleaned by the SQL pipeline) --
# longitude/latitude are handled separately since they need float parsing.
_TEXT_COLUMNS = (
    "project_code",
    "project_title",
    "title",
    "short_title",
    "site_type",
    "subtype",
    "stage",
    "target_group_name",
    "commodity_group_name",
    "development_region",
    "lga_name",
    "active_flag",
)


def _empty_to_none(value: str | None) -> str | None:
    """`\\copy ... TO csv` writes SQL NULL as an empty field -- map it back."""
    return value if value else None


def _to_float(value: str | None) -> float | None:
    value = _empty_to_none(value)
    if value is None:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _load_rows() -> list[Site]:
    rows: list[Site] = []
    with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            site_code = _empty_to_none(raw.get("site_code"))
            if not site_code:
                continue  # mirrors SQL/03: WHERE sitecode IS NOT NULL AND sitecode != ''

            rows.append(
                Site(
                    site_code=site_code,
                    longitude=_to_float(raw.get("longitude")),
                    latitude=_to_float(raw.get("latitude")),
                    **{col: _empty_to_none(raw.get(col)) for col in _TEXT_COLUMNS},
                )
            )
    return rows


def _validate_rows(rows: list[Site]) -> None:
    """Fail fast on data problems rather than silently loading a bad snapshot.

    Duplicate site_code is checked here (not left to the DB) because a
    primary-key violation mid-insert would abort the whole transaction with
    a much less useful error than naming the offending codes up front.
    """
    if len(rows) < MIN_EXPECTED_ROWS:
        raise ValueError(
            f"Only parsed {len(rows)} rows from {CSV_PATH.name}, expected at least "
            f"{MIN_EXPECTED_ROWS}. Refusing to seed -- check the CSV isn't truncated "
            "or malformed."
        )

    site_codes = [row.site_code for row in rows]
    duplicates = [code for code, count in Counter(site_codes).items() if count > 1]
    if duplicates:
        raise ValueError(
            f"Found {len(duplicates)} duplicate SITE_CODE value(s) in the CSV, "
            f"e.g. {duplicates[:5]}. site_code is the primary key and must be unique."
        )


def _dataset_shape_warnings(rows: list[Site]) -> list[str]:
    """Non-fatal checks for UI assumptions a data refresh can break.

    Warnings, not errors, on purpose: unlike _validate_rows' checks these
    aren't data *corruption* -- the rows are fine -- they're signals that
    frontend constants or docs need revisiting. Blocking the seed would
    hold the whole app hostage to a display-layer constant. The "after
    refreshing" checklist in DATABASES/README_database.md explains what
    to do about each one.
    """
    warnings: list[str] = []

    if len(rows) > MAP_PAGE_SIZE:
        warnings.append(
            f"Dataset has {len(rows)} rows, more than MAP_PAGE_SIZE ({MAP_PAGE_SIZE}): "
            "the map page fetches a single page of that size and will silently "
            "drop the rest of the pins. Raise MAP_PAGE_SIZE in "
            "frontend/src/pages/MapPage.tsx or paginate the map fetch."
        )

    project_sizes = Counter(
        row.project_code for row in rows if row.project_code is not None
    )
    oversized = {
        code: count
        for code, count in project_sizes.items()
        if count > RELATED_FETCH_SIZE
    }
    for code, count in sorted(oversized.items()):
        warnings.append(
            f"Project {code} has {count} sites, more than RELATED_FETCH_SIZE "
            f"({RELATED_FETCH_SIZE}): the site detail page fetches related sites "
            "in a single page of that size and will silently omit the overflow. "
            "Raise RELATED_FETCH_SIZE in frontend/src/pages/SiteDetailPage.tsx."
        )

    titles_by_code: dict[str, set[str]] = {}
    for row in rows:
        if row.project_code is not None and row.project_title is not None:
            titles_by_code.setdefault(row.project_code, set()).add(row.project_title)
    for code, titles in sorted(titles_by_code.items()):
        if len(titles) > 1:
            warnings.append(
                f"Project {code} has {len(titles)} distinct titles "
                f"({', '.join(repr(t) for t in sorted(titles))}): /api/kpis' "
                "top_projects groups by (project_code, project_title), so one "
                "real project would split into multiple rows and undercount. "
                "Fix the titles in the source data, or make them consistent "
                "in the SQL cleaning pipeline."
            )

    return warnings


def seed() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Cleaned dataset not found at {CSV_PATH}. Regenerate it by running "
            "SQL/01 through SQL/05 against a Postgres database and exporting "
            "`sites` -- see this file's module docstring for the exact command. "
            "See also DATABASES/README_database.md."
        )

    Base.metadata.create_all(bind=engine)
    rows = _load_rows()
    _validate_rows(rows)
    for warning in _dataset_shape_warnings(rows):
        print(f"WARNING: {warning}")

    db = SessionLocal()
    try:
        db.execute(delete(Site))  # idempotent: safe to re-run on a fresh CSV drop
        db.add_all(rows)
        db.commit()

        actual_count = db.scalar(select(func.count()).select_from(Site)) or 0
        if actual_count != len(rows):
            raise RuntimeError(
                f"Post-insert row count ({actual_count}) doesn't match rows loaded "
                f"({len(rows)}) -- the DB may be in an inconsistent state."
            )
    finally:
        db.close()

    print(f"Seeded {len(rows)} sites from {CSV_PATH.name}")


if __name__ == "__main__":
    seed()
