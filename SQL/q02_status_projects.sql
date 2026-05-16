-- q02_status_projects.sql
-- Business question: How many projects are in each operational stage?
-- Stakeholder: Strategy Manager / Operations Manager

SELECT
    stage           AS status,
    COUNT(*)        AS project_count
FROM projects
WHERE active_flag = 'Y'
GROUP BY stage
ORDER BY project_count DESC;