-- Create the cleaned analytical table
--
-- title / short_title: added here (originally dropped from this pipeline,
-- present in staging_sites/the raw CSV) -- they're the human-readable site
-- name any UI needs; without them a consumer of this table has nothing to
-- label a site with beyond its site_code. Left untouched by INITCAP in
-- 03_insert_cleaned_data.sql -- these are already-authored proper names in
-- the source data (e.g. "Abra Underground"), not enum-like categorical
-- fields, so TRIM-only mirrors backend/app/db/seed.py's _clean_text().
CREATE TABLE sites (
    site_code TEXT PRIMARY KEY,
    project_code TEXT NOT NULL,
    project_title TEXT,
    title TEXT,
    short_title TEXT,
    site_type TEXT,
    subtype TEXT,
    stage TEXT,
    target_group_name TEXT,
    commodity_group_name TEXT,
    development_region TEXT,
    lga_name TEXT,
    longitude NUMERIC(10, 6),
    latitude NUMERIC(10, 6),
    active_flag TEXT
);
