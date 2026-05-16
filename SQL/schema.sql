-- schema.sql
-- WA Mining Operations Dashboard – Project Schema
-- Author: tonynguyen1292
-- Date: May 2026

-- Drop existing table if it exists
DROP TABLE IF EXISTS projects;

-- Create projects table
CREATE TABLE projects (
    site_code           TEXT        PRIMARY KEY,
    project_code        TEXT,
    project_title       TEXT,
    site_title          TEXT,
    site_type           TEXT,
    sub_type            TEXT,
    stage               TEXT,
    commodity_raw       TEXT,
    commodity_group     TEXT,
    commodity_category  TEXT,
    development_region  TEXT,
    lga_name            TEXT,
    active_flag         TEXT,
    symbol_status       TEXT,
    map_series          TEXT,
    longitude           REAL,
    latitude            REAL,
    extract_date        TEXT
);