# WA Mining Projects — Data Pipeline & Reporting System

A PostgreSQL/SQL data pipeline that cleans and models Western Australia's public Major Resources Projects dataset (MINEDEX), with a Power BI reporting layer on top of it.

## Project Overview

This project takes a raw government export of WA mining, infrastructure, and petroleum sites and turns it into an analysis-ready data model. The core of the repo is the SQL pipeline (`SQL/01`–`05`): raw load → cleaned/typed table → summary views → portfolio rollup. Power BI connects to the resulting database for visual reporting.

The CSV snapshot currently included in this repo (`DATABASES/raw/Major_Resource_Projects.csv`) contains 421 site records across 356 distinct projects.

## Problem Statement

The source dataset is a flat CSV with data-quality issues typical of a raw government export: inconsistent region/LGA labels (suffixes like ", SHIRE OF"), two overlapping status encodings (`STAGE` and `SYMBOL_STATUS`), and a site-vs-project grain mismatch — a single project can have multiple sites (mine, processing plant, port), so naive counting double-counts projects. Before any reporting is possible, the data has to be cleaned and modeled with an explicit grain decision. That's what the SQL layer in this repo does.

## System / Workflow Summary

```
Major_Resource_Projects.csv (DATABASES/raw/)
        │
        ▼
SQL/01_create_raw_table.sql    →  staging_sites (raw load, all columns as TEXT)
        │
        ▼
SQL/02_create_clean_table.sql  →  sites (typed, cleaned schema)
SQL/03_insert_cleaned_data.sql →  cleaning + standardization applied on insert
        │
        ▼
SQL/04_create_summary_view.sql →  views: sites_by_commodity, sites_by_stage,
                                    sites_by_region, sites_by_type
SQL/05_portfolio_summary.sql   →  portfolio_summary rollup table
        │
        ▼
Power BI (POWER_BI/wa_mining_dashboard_v2.pbix)
```

`SQL/run_all.sql` runs the full sequence above in one pass — see *Setup / How to Run*.

The PostgreSQL database (`wa_mining`) is the source of truth for the analytical model; Power BI connects to it and replicates part of the `portfolio_summary` logic in DAX for interactive slicing (see *Key Engineering Decisions*).

## Tech Stack

- **PostgreSQL + SQL** — data loading, cleaning, and modeling (staging → clean → views)
- **Power BI + DAX** — dashboard and interactive reporting
- **Git / GitHub** — version control and documentation
- **Notion** — supplementary planning docs and task tracking from early project stages (see *Further Reading*; not part of the technical pipeline)

## Repository Structure

```
WA_Mining/
├── README.md
├── data_dictionary.md
├── .gitignore
├── image.png                          # legacy screenshot, superseded by POWER_BI/screenshots/ (pending cleanup)
├── image-1.png                        # legacy screenshot, superseded by POWER_BI/screenshots/ (pending cleanup)
├── DATABASES/
│   ├── README_database.md             # explains where to download the CSV from
│   └── raw/
│       └── Major_Resource_Projects.csv
├── DOCUMENTS/
│   ├── Licence_CCBY4.pdf
│   └── METADATA/
│       ├── MINEDEX_Major_Resource_Projects_Map_DataDictionary_GDA2020.pdf
│       └── MINEDEX_Major_Resource_Projects_Map_Metadata_GDA2020.pdf
├── SQL/
│   ├── 01_create_raw_table.sql
│   ├── 02_create_clean_table.sql
│   ├── 03_insert_cleaned_data.sql
│   ├── 04_create_summary_view.sql
│   ├── 05_portfolio_summary.sql
│   └── run_all.sql
└── POWER_BI/
    ├── wa_mining_dashboard_v1.pbix     # superseded by v2, kept for now (see Future Improvements)
    ├── wa_mining_dashboard_v2.pbix     # current version
    └── screenshots/
        ├── dashboard_overview.png
        └── dashboard_regional_analysis.png
```

## Setup / How to Run

1. Install PostgreSQL locally.
2. Create the database and run the full pipeline:
   ```
   createdb wa_mining
   psql -d wa_mining -f SQL/run_all.sql
   ```
   This runs `01`→`05` in order and loads `DATABASES/raw/Major_Resource_Projects.csv` into `staging_sites` along the way. Run it from the repository root so the relative paths resolve.
3. Open `POWER_BI/wa_mining_dashboard_v2.pbix` in Power BI Desktop and refresh the data connection.

`DATABASES/README_database.md` currently documents this CSV as something to download fresh from the DMIRS Data and Software Centre rather than store in the repo — in practice a snapshot is committed under `DATABASES/raw/` today. This is a known inconsistency, not yet resolved (see *Future Improvements*).

## Key Engineering Decisions

- **Grain:** modeled at site level, not project level, to preserve operational asset detail — multiple sites can map to a single project code (`PROJ_CODE`); this repo's snapshot has 421 sites across 356 projects.
- **Schema:** a single flat, typed table (`sites`) rather than a star schema — the snapshot data doesn't have update/history requirements that would justify one.
- **Commodity dimension:** `TARGET_GROUP_NAME` is used as the primary commodity field instead of the raw `COMMODITIES` column, which stores pipe-delimited multi-value lists that aren't directly groupable.
- **Status field:** `STAGE` is used as the primary status dimension; `SYMBOL_STATUS` (a second, overlapping status encoding in the source data) is kept only for cross-checking, not as a reporting field.
- **String cleaning:** region and LGA names are standardized in SQL (`TRIM`, `INITCAP`, and `CASE`-based suffix handling in `03_insert_cleaned_data.sql`) rather than in Power Query, so the cleaning logic lives with the data model and is re-runnable independent of the BI tool.
- **DAX/SQL parity:** the Power BI measures replicate the `portfolio_summary` SQL logic (COUNT/CASE patterns) rather than reimplementing separate business logic in DAX from scratch.

## Challenges and Trade-offs

| Challenge | Approach taken |
|---|---|
| Mixed asset types (mine, infrastructure, deposit, other) in one source table | Segmented using `TARGET_GROUP_NAME` and `SITE_TYPE`, documented in `data_dictionary.md` |
| Multi-commodity fields with pipe-delimited lists | Used the cleaned `TARGET_GROUP_NAME` single-value field instead of parsing `COMMODITIES` |
| Region/LGA names with inconsistent suffixes (e.g. ", SHIRE OF") | Handled in SQL with `CASE`-based text transforms during the clean-table insert |
| Site-to-project duplicate counting | Exposed both project-level and site-level counts as separate measures in Power BI, rather than picking one and hiding the ambiguity |
| No capital-cost field in the source dataset | Out of scope for this version — noted explicitly in `data_dictionary.md` rather than estimated or backfilled |
| `05_portfolio_summary.sql` only buckets 4 of the 6 real `STAGE` values (`Operating`, `Proposed`, `Care and Maintenance`, `Under Development`) | Known gap — `Undeveloped` (33 sites) and `Shut` (3 sites) currently fall outside the per-stage breakdown, though they're still included in `total_sites`. Not fixed in this pass; tracked in Future Improvements |

## Screenshots

**Overview page** — portfolio-wide snapshot (commodity, stage, region breakdowns):

![Dashboard overview page](POWER_BI/screenshots/dashboard_overview.png)

**Regional and Operational View** — drill-down by region, project, and site type:

![Dashboard regional and operational view](POWER_BI/screenshots/dashboard_regional_analysis.png)

`wa_mining_dashboard_v2.pbix` is the current version — it corrects region/LGA name suffixes that `v1` still has.

## Business Context

The dataset is sourced from DMIRS's MINEDEX Major Resource Projects export and covers WA's mining, mineral processing, and petroleum sites. In the CSV snapshot currently in this repo: 229 Mine sites, 158 Infrastructure sites, 33 Deposit sites, and 1 Other site, across 356 distinct projects. By stage: 261 Operating, 74 Proposed, 40 Care and Maintenance, 33 Undeveloped, 10 Under Development, and 3 Shut. Projects cluster regionally (e.g. iron ore concentrated in the Pilbara, gold in the Goldfields), which is one of the drill-downs the dashboard supports.

## Data Source

- DMIRS Data and Software Centre – [MINEDEX Major Resource Projects](https://dasc.dmirs.wa.gov.au/home?productAlias=MINEDEXMajorResProj) (see `DATABASES/README_database.md` for download steps)
- WA Government – [Western Australia's Principal Resource Projects](https://www.wa.gov.au/organisation/department-of-mines-petroleum-and-exploration/western-australias-principal-resource-projects)
- Licence: `DOCUMENTS/Licence_CCBY4.pdf` (CC BY 4.0)
- Metadata: `DOCUMENTS/METADATA/`
- Field-level documentation: [`data_dictionary.md`](./data_dictionary.md)

## Future Improvements

- Reconcile `DATABASES/README_database.md` (says the CSV isn't stored in the repo) with the fact that a snapshot currently is — either remove the tracked CSV (`.gitignore` now correctly excludes future changes to it) or update the doc to reflect that a snapshot is intentionally kept.
- Fix the `STAGE` bucketing gap in `05_portfolio_summary.sql` so `Undeveloped` and `Shut` sites are counted in the per-stage breakdown, not just in `total_sites`.
- Decide whether to keep `POWER_BI/wa_mining_dashboard_v1.pbix` (superseded by v2) or remove it.
- Remove or repurpose the legacy `image.png` / `image-1.png` at the repo root now that screenshots live under `POWER_BI/screenshots/`.
- Add basic data-validation checks after load (row counts, null checks on primary keys) rather than relying on manual review.
- Consider a `docker-compose` setup for PostgreSQL to reduce local setup steps.

## Further Reading (optional, external)

Supplementary planning documents from earlier project stages — not required to understand the technical pipeline:

- [Notion Case Study](https://www.notion.so/WA-Mining-Operations-Dashboard-Business-Analyst-Portfolio-Project-35fd7e4273f0809ba6cecc2f77d9aa5f)
- [7-Day Project Plan](https://www.notion.so/7-day-Project-Mining-Plan-35fd7e4273f08090aa5ad18388ff8202)
- [Portfolio Instructions](https://www.notion.so/WA-Mining-Portfolio-Instructions-363d7e4273f08052844def6827925a8c)
