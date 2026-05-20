-- Insert data with cleaning applied
INSERT INTO sites (
    site_code,
    project_code,
    project_title,
    site_type,
    subtype,
    stage,
    target_group_name,
    commodity_group_name,
    development_region,
    lga_name,
    longitude,
    latitude,
    active_flag
)
SELECT 
    TRIM(sitecode) AS site_code,
    TRIM(projcode) AS project_code,
    TRIM(projecttitle) AS project_title,
    TRIM(sitetype) AS site_type,
    TRIM(subtype) AS subtype,
    TRIM(INITCAP(stage)) AS stage,  -- Standardize to Title Case
    TRIM(targetgroupname) AS target_group_name,
    TRIM(commoditygroupname) AS commodity_group_name,
    TRIM(developmentregion) AS development_region,
    TRIM(lganame) AS lga_name,
    longitude,
    latitude,
    TRIM(activeflag) AS active_flag
FROM staging_sites
WHERE sitecode IS NOT NULL  -- Only include rows with a site code
    AND sitecode != '';     -- Exclude blank site codes