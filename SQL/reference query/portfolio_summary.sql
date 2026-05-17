CREATE TABLE portfolio_summary AS
SELECT 
    COUNT(*) AS total_sites,
    COUNT(DISTINCT project_code) AS total_projects,
    COUNT(CASE WHEN stage = 'Operating' THEN 1 END) AS operating_sites,
    COUNT(CASE WHEN stage = 'Proposed' THEN 1 END) AS proposed_sites,
    COUNT(CASE WHEN stage = 'Care And Maintenance' THEN 1 END) AS care_maintenance_sites,
    COUNT(CASE WHEN stage = 'Under Development' THEN 1 END) AS under_development_sites,
    COUNT(CASE WHEN site_type = 'Mine' THEN 1 END) AS mines,
    COUNT(CASE WHEN site_type = 'Infrastructure' THEN 1 END) AS infrastructure,
    COUNT(CASE WHEN site_type = 'Deposit' THEN 1 END) AS deposits
FROM sites;

-- View the summary
SELECT * FROM portfolio_summary;