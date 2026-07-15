"""Seed the `sites` table from the raw MINEDEX CSV snapshot.

Ports the cleaning rules from SQL/01_create_raw_table.sql through
SQL/03_insert_cleaned_data.sql (TRIM / INITCAP / region+LGA suffix
handling) directly into Python, so the app doesn't need a psql-driven
staging step. The CSV is read once and cleaned rows are inserted straight
into `sites` -- `staging_sites` from the original pipeline has no
equivalent here.

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

# backend/app/db/seed.py -> backend/app -> backend -> repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
CSV_PATH = REPO_ROOT / "DATABASES" / "raw" / "Major_Resource_Projects.csv"

_LGA_SUFFIXES = (
    (", SHIRE OF", "Shire Of "),
    (", CITY OF", "City Of "),
    (", TOWN OF", "Town Of "),
)


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _title_case(value: str | None) -> str | None:
    value = _clean_text(value)
    return value.title() if value else None


def _clean_region(value: str | None) -> str | None:
    """Mirrors SQL/03: strip the ', Development Region' suffix, then title-case."""
    value = _clean_text(value)
    if not value:
        return None
    return value.replace(", Development Region", "").strip().title()


def _clean_lga(value: str | None) -> str | None:
    """Mirrors SQL/03's CASE block for SHIRE OF / CITY OF / TOWN OF suffixes."""
    value = _clean_text(value)
    if not value:
        return None
    upper = value.upper()
    for suffix, prefix in _LGA_SUFFIXES:
        if upper.endswith(suffix):
            base = value[: -len(suffix)].strip()
            return f"{prefix}{base.title()}"
    return value.title()


def _to_float(value: str | None) -> float | None:
    value = _clean_text(value)
    if not value:
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
            site_code = _clean_text(raw.get("SITE_CODE"))
            if not site_code:
                continue  # mirrors SQL/03: WHERE sitecode IS NOT NULL AND sitecode != ''

            rows.append(
                Site(
                    site_code=site_code,
                    project_code=_clean_text(raw.get("PROJ_CODE")),
                    project_title=_clean_text(raw.get("PROJECT_TITLE")),
                    title=_clean_text(raw.get("TITLE")),
                    short_title=_clean_text(raw.get("SHORT_TITLE")),
                    site_type=_title_case(raw.get("SITE_TYPE")),
                    subtype=_title_case(raw.get("SUB_TYPE")),
                    stage=_title_case(raw.get("STAGE")),
                    target_group_name=_title_case(raw.get("TARGET_GROUP_NAME")),
                    commodity_group_name=_title_case(raw.get("COMMODITY_GROUP_NAME")),
                    development_region=_clean_region(raw.get("DEVELOPMENT_REGION")),
                    lga_name=_clean_lga(raw.get("LGA_NAME")),
                    longitude=_to_float(raw.get("LONGITUDE")),
                    latitude=_to_float(raw.get("LATITUDE")),
                    active_flag=_clean_text(raw.get("ACTIVE_FLAG")),
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


def seed() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Raw dataset not found at {CSV_PATH}. "
            "See DATABASES/README_database.md for how to obtain it."
        )

    Base.metadata.create_all(bind=engine)
    rows = _load_rows()
    _validate_rows(rows)

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
