-- q03_region_projects.sql
-- Business question: Which development regions have the most projects?
-- Stakeholder: Operations Manager / Regional Lead

SELECT
    development_region  AS region,
    COUNT(*)            AS project_count
FROM projects
WHERE active_flag = 'Y'
GROUP BY development_region
ORDER BY project_count DESC;