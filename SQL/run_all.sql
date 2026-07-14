-- WA Mining data pipeline: runs the full staging -> clean -> views -> summary
-- sequence in order. Run from the repository root so the relative paths
-- below (SQL/... and DATABASES/...) resolve correctly.
--
-- Usage:
--   createdb wa_mining
--   psql -d wa_mining -f SQL/run_all.sql

\i SQL/01_create_raw_table.sql

\copy staging_sites FROM 'DATABASES/raw/Major_Resource_Projects.csv' WITH (FORMAT csv, HEADER true)

\i SQL/02_create_clean_table.sql
\i SQL/03_insert_cleaned_data.sql
\i SQL/04_create_summary_view.sql
\i SQL/05_portfolio_summary.sql

-- Sanity check
SELECT * FROM portfolio_summary;
