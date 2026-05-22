-- Create the cleaned analytical table
CREATE TABLE sites (
    site_code TEXT PRIMARY KEY,
    project_code TEXT NOT NULL,
    project_title TEXT,
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
