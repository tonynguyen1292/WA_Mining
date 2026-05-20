-- Sites by commodity
CREATE VIEW sites_by_commodity AS
SELECT 
    target_group_name,
    COUNT(*) AS site_count
FROM sites
GROUP BY target_group_name
ORDER BY site_count DESC;

-- Sites by stage
CREATE VIEW sites_by_stage AS
SELECT 
    stage,
    COUNT(*) AS site_count
FROM sites
GROUP BY stage
ORDER BY site_count DESC;

-- Sites by region
CREATE VIEW sites_by_region AS
SELECT 
    development_region,
    COUNT(*) AS site_count
FROM sites
GROUP BY development_region
ORDER BY site_count DESC;

-- Sites by type
CREATE VIEW sites_by_type AS
SELECT 
    site_type,
    COUNT(*) AS site_count
FROM sites
GROUP BY site_type
ORDER BY site_count DESC;