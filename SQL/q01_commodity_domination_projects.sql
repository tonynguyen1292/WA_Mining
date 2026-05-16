-- q01_commodity_domination_projects.sql
-- Business question: Which commodities dominate the WA project pipeline?
-- Stakeholder: Portfolio Manager / CFO

SELECT
    commodity_category      AS commodity,
    COUNT(*)                AS project_count
FROM projects
WHERE active_flag = 'Y'
GROUP BY commodity_category
ORDER BY project_count DESC;