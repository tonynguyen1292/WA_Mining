-- Insert data with cleaning applied
INSERT INTO sites (
    site_code,
    project_code,
    project_title,
    title,
    short_title,
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
    NULLIF(TRIM(title), '') AS title,
    NULLIF(TRIM(shorttitle), '') AS short_title,
    TRIM(INITCAP(sitetype)) AS site_type,
    TRIM(INITCAP(subtype)) AS subtype,
    TRIM(INITCAP(stage)) AS stage,  -- Standardize to Title Case
    TRIM(INITCAP(targetgroupname)) AS target_group_name,
    TRIM(INITCAP(commoditygroupname)) AS commodity_group_name,
    TRIM(INITCAP(REPLACE(developmentregion, ', Development Region', ''))) AS development_region,
     CASE
        WHEN lganame ILIKE '%, SHIRE OF' THEN
            'Shire Of ' || TRIM(INITCAP(REPLACE(lganame, ', SHIRE OF', '')))
        WHEN lganame ILIKE '%, CITY OF' THEN
            'City Of ' || TRIM(INITCAP(REPLACE(lganame, ', CITY OF', '')))
        WHEN lganame ILIKE '%, TOWN OF' THEN
            'Town Of ' || TRIM(INITCAP(REPLACE(lganame, ', TOWN OF', '')))
        ELSE TRIM(INITCAP(lganame))
    END AS lga_name,
    longitude,
    latitude,
    TRIM(activeflag) AS active_flag
FROM staging_sites
WHERE sitecode IS NOT NULL  -- Only include rows with a site code
    AND sitecode != '';     -- Exclude blank site codes