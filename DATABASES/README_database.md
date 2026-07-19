# DATABASES

Two committed CSVs live here, each with a different job. Both are tracked in
git — not left for a fresh clone to go download — because each is a direct
input something else in this repo needs to run out of the box: the app's
own seed step, and (indirectly, via the SQL pipeline) the Power BI
dashboard.

## `raw/Major_Resource_Projects.csv`

The unmodified source snapshot, as downloaded from DMIRS. This is the input
to `SQL/01_create_raw_table.sql`'s `\copy` step and to
`SQL/run_all.sql` — see the root README's [System / Workflow
Summary](../README.md#system--workflow-summary) and [Setup / How to Run
(legacy SQL + Power BI)](../README.md#setup--how-to-run-legacy-sql--power-bi).

### Data source

**MINEDEX Major Resource Projects** from the DMIRS Data and Software
Centre: [MINEDEX Major Resource
Projects](https://dasc.dmirs.wa.gov.au/home?productAlias=MINEDEXMajorResProj).

### Getting a fresh copy

1. Open the dataset page linked above.
2. Locate **MINEDEX Major Resource Projects Map** and choose the **CSV** download option.
3. Download the file and extract it if it's a compressed archive.
4. Replace `raw/Major_Resource_Projects.csv` with it.
5. Regenerate `Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv` from the new raw file (see below) — nothing downstream picks up a raw-file change automatically.

DMIRS states MINEDEX is free to use, with bulk downloads in multiple
formats. The Data and Software Centre updates on its own schedule, so this
committed snapshot will drift from the live source over time — that's
expected; re-download when you specifically want current data, not by
default.

## `Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv`

The output of actually running `SQL/01_create_raw_table.sql` through
`SQL/05_portfolio_summary.sql` against the raw CSV above, then exporting
the resulting `sites` table. This is what `backend/app/db/seed.py` loads
to populate the app's database — the app does not read `raw/` directly or
re-implement any cleaning itself; the SQL pipeline is the one and only
place the TRIM/INITCAP/suffix-handling rules live.

### Regenerating it

After replacing `raw/Major_Resource_Projects.csv` with a fresh download, or
after changing the cleaning rules in `SQL/02`/`03`:

```
createdb wa_mining_pipeline      # or any database isolated from the app's own wa_mining DB
psql -d wa_mining_pipeline -f SQL/run_all.sql
psql -d wa_mining_pipeline -c "\copy sites TO 'DATABASES/Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv' WITH (FORMAT csv, HEADER true)"
```

Run both from the repository root so the relative paths resolve. Then
re-seed the app (`docker compose exec backend python -m app.db.seed`, or
the native equivalent) to pick up the change.

**Use a database the running app isn't connected to.** `SQL/02` does
`CREATE TABLE sites` with no existence check, so running it against the
app's live database would error against an already-existing table rather
than silently overwriting anything — but keeping the pipeline run
completely separate avoids that failure mode entirely, and avoids any
chance of the app reading a half-populated table mid-run.
