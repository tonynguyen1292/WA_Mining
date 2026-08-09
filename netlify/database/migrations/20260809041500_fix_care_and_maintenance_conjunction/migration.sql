-- Correct the stage value mangled by SQL/03's INITCAP (WMDP2-77).
--
-- INITCAP capitalizes every word, so the MINEDEX export's correct
-- 'Care and Maintenance' was stored as 'Care And Maintenance' -- in the
-- cleaned CSV, and therefore in the rows the 20260720135732 seed migration
-- inserted here. SQL/03 now lowercases the conjunction, but that only fixes
-- data generated from this point on.
--
-- This is written as a NEW forward migration rather than an edit to
-- 20260720135732 on purpose. That migration has already been applied to the
-- deployed managed Postgres; rewriting it would leave the live database
-- holding the wrong value while any freshly provisioned environment got the
-- corrected seed, which is exactly the kind of silent divergence the contract
-- work (WMDP2-76) exists to catch.
--
-- Idempotent: the WHERE clause matches nothing on a database seeded from the
-- corrected CSV, so this is safe to re-run and safe on a fresh environment.
UPDATE "sites"
SET "stage" = 'Care and Maintenance'
WHERE "stage" = 'Care And Maintenance';
