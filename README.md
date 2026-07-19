# WA Mining Portfolio — Data Pipeline & Full-Stack Application

[![CI](https://github.com/tonynguyen1292/WA_Mining/actions/workflows/ci.yml/badge.svg)](https://github.com/tonynguyen1292/WA_Mining/actions/workflows/ci.yml)

A PostgreSQL-backed system for Western Australia's public Major Resources Projects dataset (MINEDEX): a SQL data pipeline that cleans and models the raw government export, and a FastAPI + React application built on top of it for exploring the portfolio interactively. A Power BI dashboard remains available as an alternative reporting surface on the same data.

## Project Overview

This project takes a raw government export of WA mining, infrastructure, and petroleum sites and turns it into an analysis-ready data model, then exposes it two ways:

- **The app** (`backend/` + `frontend/`) — a live, filterable dashboard, sortable sites explorer, and map view. This is the primary, actively developed interface. See [Getting Started](#getting-started).
- **The original SQL pipeline + Power BI** (`SQL/`, `POWER_BI/`) — the pipeline that established the cleaning rules the app now reuses, and a static dashboard on the same rules. Kept as reference/lineage documentation. See [System / Workflow Summary](#system--workflow-summary).

The CSV snapshot currently included in this repo (`DATABASES/raw/Major_Resource_Projects.csv`) contains 421 site records across 356 distinct projects.

## Problem Statement

The source dataset is a flat CSV with data-quality issues typical of a raw government export: inconsistent region/LGA labels (suffixes like ", SHIRE OF"), two overlapping status encodings (`STAGE` and `SYMBOL_STATUS`), and a site-vs-project grain mismatch — a single project can have multiple sites (mine, processing plant, port), so naive counting double-counts projects. Before any reporting is possible, the data has to be cleaned and modeled with an explicit grain decision. That's what the SQL layer in this repo does.

## Getting Started

The project is evolving from a SQL + Power BI analytics project into a runnable full-stack application (FastAPI + PostgreSQL + React). **Phases 1–3 are implemented: backend foundation, database + seed pipeline, and the React frontend.** Component-level detail lives in [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md); this section is the fastest path to a running app.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running, not just installed) — or a local PostgreSQL install if you'd rather skip Docker (see Step 2's native option)
- [Node.js](https://nodejs.org/) 18+ and npm, for the frontend

### Step 1 — Clone and enter the repo

```
git clone https://github.com/tonynguyen1292/WA_Mining
cd WA_Mining
```

### Step 2 — Start PostgreSQL + the backend API

```
docker compose up --build
```

This builds the FastAPI image and starts two containers: `db` (Postgres 16) and `backend` (the API, with hot reload). First run pulls the base images, so it can take a minute or two.

<details>
<summary>Prefer no Docker? Native backend setup</summary>

```
createdb wa_mining
cd backend
python -m venv .venv && .venv\Scripts\activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL if your local Postgres differs
uvicorn app.main:app --reload
```
Run the seed command in Step 3 with plain `python -m app.db.seed` instead of the `docker compose exec` form.
</details>

### Step 3 — Seed the database

In a second terminal, with the stack from Step 2 still running:

```
docker compose exec backend python -m app.db.seed
```

This loads `DATABASES/raw/Major_Resource_Projects.csv`, applies the same cleaning rules as `SQL/01`–`03` (ported to `backend/app/db/seed.py`), and populates the `sites` table. It's safe to re-run — it clears and reloads `sites` each time. You should see `Seeded 421 sites from Major_Resource_Projects.csv`.

### Step 4 — Verify the backend

Open http://localhost:8000/docs — you should see the interactive Swagger UI listing `health`, `sites`, `kpis`, and `meta` endpoints. Try `GET /api/kpis` and confirm `total_sites` is `421`.

### Step 5 — Start the frontend

In a third terminal:

```
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL defaults to http://localhost:8000, matching Step 2
npm run dev
```

### Step 6 — Verify the app

Open http://localhost:5173 — the Dashboard should load with KPI cards (421 total sites, 356 total projects) and three breakdown charts (stage/commodity/region). From there:
- **Sites** in the nav bar → a filterable, sortable, paginated table of all 421 sites (filters/sort/page are synced to the URL, so the link is shareable; **Export CSV** downloads the current filtered view in full)
- **Map** in the nav bar → all matching sites plotted on a map, colored by stage, with the same filters
- Click any site → its full detail page
- Press **Ctrl+K** (or **⌘K**) anywhere, or click **Search sites** in the header → a global command palette; type to search, ↑/↓ to move, Enter to open a site directly

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `docker compose up` fails to connect / hangs | Docker Desktop isn't running — start it and wait for "Engine running" before retrying |
| Backend starts but `/api/sites` returns an empty list | Seed step (Step 3) hasn't been run yet, or hasn't finished |
| Frontend loads but shows no data / network errors in console | Backend isn't running, or `frontend/.env`'s `VITE_API_BASE_URL` doesn't match where the API is actually listening |
| `docker compose exec backend python -m app.db.seed` can't find the CSV | You're not running it from the repo root, or `DATABASES/raw/Major_Resource_Projects.csv` isn't present — see `DATABASES/README_database.md` |

### Running the tests

```
# backend (from backend/, with requirements-dev.txt installed)
pytest

# frontend (from frontend/)
npm run test -- --run
```

Both run in CI on every push/PR to `main`. See `backend/README.md` and `frontend/README.md` for what each suite actually covers.

### Key endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness check |
| `GET /api/sites` | Paginated site list; filter with `commodity`, `region`, `stage`, `site_type` (each repeatable for multi-select, e.g. `?region=Pilbara&region=Kimberley`), `search`; sort with `sort` (e.g. `?sort=-stage`, allowlisted, invalid values return 422) |
| `GET /api/sites/export` | The same filtered+sorted view as a CSV download (full result set, not one page); same `commodity`/`region`/`stage`/`site_type`/`search`/`sort` params |
| `GET /api/sites/{site_code}` | Single site detail |
| `GET /api/kpis` | Portfolio KPIs (totals + breakdowns by stage/type/commodity/region), same filters as above |
| `GET /api/meta/filters` | Distinct filter values, for populating dropdowns |

## Production / Deployment

`docker-compose.yml` (used above) is for local development: it bind-mounts `backend/` for hot reload and runs `uvicorn --reload`. For a production-like build — no source mounts, no reload, the frontend built and served as static assets through nginx — use `docker-compose.prod.yml` instead:

```
docker compose -f docker-compose.prod.yml up --build
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```

- App (nginx, static build + reverse-proxied API): http://localhost:8080

Differences from the dev compose file: the backend runs without `--reload` and **has no host port mapping at all** — `frontend/nginx.conf` reverse-proxies `/api`, `/health`, `/docs`, and `/openapi.json` to the backend over the internal Compose network, so nginx (port 8080 locally, port 80 in the cloud) is the only thing reachable from outside the stack; the frontend is a multi-stage build (`frontend/Dockerfile`) — `npm run build` in a `node` stage, then served by `nginx` (which also handles the SPA fallback so client-side routes like `/sites/S0001538` don't 404 on a hard refresh); and Postgres isn't exposed to the host either. This is still a single-host Compose setup, not a multi-node cloud deployment — see Future Improvements for what's not covered (TLS, horizontal scaling, automated CD).

### CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: backend lint (`ruff`) + compile check + tests (`pytest`), and frontend tests (`vitest`) + typecheck + build (`tsc -b && vite build`). All must pass before merging.

### Cloud Deployment (AWS)

[DEPLOYMENT.md](DEPLOYMENT.md) is a step-by-step runbook for deploying this same `docker-compose.prod.yml` stack to a single free-tier-eligible AWS EC2 instance — architecture, an explicit cost/billing gate (checked before creating anything), launch/configure/deploy/verify steps, and teardown. **Not yet executed** — it requires AWS credentials this environment doesn't have configured.

## System / Workflow Summary

This is the original SQL pipeline. It's kept as the documented, reusable source of truth for the cleaning rules — `backend/app/db/seed.py` ports this same logic (TRIM / INITCAP / region+LGA suffix handling) directly into the application's seed step, so the two stay conceptually in sync. Power BI remains a valid alternative reporting surface on the same database.

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

`SQL/run_all.sql` runs the full sequence above in one pass — see *Setup / How to Run (legacy SQL + Power BI)* below.

The PostgreSQL database (`wa_mining`) is the source of truth for the analytical model; Power BI connects to it and replicates part of the `portfolio_summary` logic in DAX for interactive slicing (see *Key Engineering Decisions*).

## Tech Stack

- **PostgreSQL** — system of record, both for the original SQL pipeline and the FastAPI app's `sites` table
- **FastAPI + SQLAlchemy** — read-only API over the cleaned portfolio data (`backend/`)
- **React + TypeScript + Vite** — dashboard, sites explorer, map, and site detail pages (`frontend/`)
- **Recharts** — portfolio breakdown charts
- **Leaflet + react-leaflet** — the map view (free OpenStreetMap tiles, no API key)
- **pytest** — backend tests, against an in-memory SQLite DB (`backend/tests/`)
- **Vitest + React Testing Library** — frontend tests (`frontend/src/**/*.test.ts(x)`)
- **Docker Compose** — local dev (`docker-compose.yml`) and a production-like build (`docker-compose.prod.yml`, nginx-served frontend)
- **GitHub Actions** — CI: backend lint/compile/test, frontend test/typecheck/build
- **Power BI + DAX** — dashboard and interactive reporting (legacy/reference reporting surface)
- **Git / GitHub** — version control and documentation
- **Jira** — active backlog and sprint tracking (see *Further Reading*)
- **Notion** — early-stage planning docs, superseded by the Jira backlog (see *Further Reading*)

## How This Was Built

This is a solo project, built with Claude (Anthropic's AI coding assistant) as a pair-programming tool for scaffolding, refactoring, and documentation drafts — you'll see it credited as a co-author in the commit history. The parts that matter are mine: the problem framing, the site-vs-project grain decision, the data-cleaning business rules, the API and schema design, and every trade-off documented in *Key Engineering Decisions* below. I treat AI assistance the way I'd treat any power tool — it speeds up the typing, not the thinking — and I can walk through any file in this repo and explain why it looks the way it does.

## Repository Structure

```
WA_Mining/
├── README.md
├── data_dictionary.md
├── DEPLOYMENT.md                      # AWS EC2 deployment runbook (not yet executed)
├── WA_MINING_PROJECT_PLAN.md          # current feature roadmap: delivered, next up, and why
├── JIRA_BACKLOG.md                    # Epic/Story/Subtask backlog plan, live in Jira as WMDP2-1..41
├── jira_backlog_import.csv            # same plan, formatted for Jira's CSV importer
├── .gitignore
├── docker-compose.yml                 # Postgres + backend, local dev (hot reload)
├── docker-compose.prod.yml            # full stack, production-like build (nginx frontend)
├── .github/workflows/ci.yml           # backend lint/compile/test + frontend test/typecheck/build
├── image.png                          # legacy screenshot, superseded by POWER_BI/screenshots/ (pending cleanup)
├── image-1.png                        # legacy screenshot, superseded by POWER_BI/screenshots/ (pending cleanup)
├── backend/                           # FastAPI app (Phase 1-2: API + DB seed pipeline)
│   ├── app/
│   │   ├── main.py                    # app entrypoint, router registration
│   │   ├── core/                      # config, DB engine/session
│   │   ├── models/                    # SQLAlchemy models (Site)
│   │   ├── schemas/                   # Pydantic request/response types
│   │   ├── api/routes/                # health, sites, kpis, meta endpoints
│   │   ├── services/                  # query logic (filters, KPI aggregation)
│   │   └── db/seed.py                 # loads + cleans the CSV into `sites`
│   ├── tests/                         # pytest: sort/filter logic + /api/sites route behavior
│   ├── requirements.txt
│   ├── requirements-dev.txt           # + ruff, pytest, httpx, for CI/local linting + testing
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── README.md                      # backend-specific setup, structure, endpoints
├── frontend/                          # React + TypeScript app (Phase 3)
│   ├── src/
│   │   ├── main.tsx, App.tsx          # entrypoint, routing, nav, command palette hook-in
│   │   ├── api/client.ts              # typed fetch wrapper over the backend API
│   │   ├── pages/                     # DashboardPage, SitesPage, SiteDetailPage, MapPage
│   │   ├── components/                # FilterBar, KpiCard, SitesTable, SitesMap, CommandPalette, charts/
│   │   ├── hooks/useDebouncedValue.ts
│   │   ├── utils/urlFilters.ts        # parse/serialize filters+page+sort <-> URL query params
│   │   ├── test/setup.ts              # vitest + jest-dom setup
│   │   └── types/site.ts
│   ├── package.json
│   ├── Dockerfile                     # multi-stage: build (node) -> serve (nginx)
│   ├── nginx.conf                     # SPA fallback for client-side routing
│   ├── .dockerignore
│   ├── .env.example
│   └── README.md                      # frontend-specific setup, structure, scripts
├── DATABASES/
│   ├── README_database.md             # explains where to download the CSV from
│   └── raw/
│       └── Major_Resource_Projects.csv
├── DOCUMENTS/
│   ├── Licence_CCBY4.pdf
│   └── METADATA/
│       ├── MINEDEX_Major_Resource_Projects_Map_DataDictionary_GDA2020.pdf
│       └── MINEDEX_Major_Resource_Projects_Map_Metadata_GDA2020.pdf
├── SQL/                                # legacy/reference pipeline — logic ported into backend/app/db/seed.py
│   ├── 01_create_raw_table.sql
│   ├── 02_create_clean_table.sql
│   ├── 03_insert_cleaned_data.sql
│   ├── 04_create_summary_view.sql
│   ├── 05_portfolio_summary.sql
│   └── run_all.sql
├── POWER_BI/                           # legacy/reference reporting surface
│   ├── wa_mining_dashboard_v1.pbix     # superseded by v2, kept for now (see Future Improvements)
│   ├── wa_mining_dashboard_v2.pbix     # current version
│   └── screenshots/
│       ├── dashboard_overview.png
│       └── dashboard_regional_analysis.png
└── prototypes/
    └── unity-shift-supervisor-demo/    # separate Unity/C# experiment, see Related Experiments below
```

## Setup / How to Run (legacy SQL + Power BI)

This runs the original pipeline standalone, without the app — useful if you only want the Power BI dashboard, or want to inspect the SQL directly. For the app, see [Getting Started](#getting-started) above.

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

The full, current roadmap — delivered features, what's next and why, and the platform/infra backlog — lives in **[WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md)**. The notes below are narrower, code-level items worth keeping close to the code they describe:

- Not yet covered by `docker-compose.prod.yml` or the AWS deployment: TLS/custom domain, horizontal scaling, and full CD (CI currently only lints/builds — deployment is manual; see [Cloud Deployment (AWS)](#cloud-deployment-aws)).
- Test coverage is a starter set, not exhaustive — `backend/tests/` covers sort/filter logic and the `/api/sites` route; frontend covers `urlFilters` and `SitesTable`'s sort cycle. `/api/kpis`, `MultiSelect`, and the URL-sync effects in `SitesPage`/`MapPage` still have no direct tests.
- `backend/app/models/site.py` adds `title` and `short_title` to the original `SQL/02` clean-table schema (present in the raw CSV/`staging_sites` but previously dropped) — needed as the human-readable site name for any UI.
- Reconcile `DATABASES/README_database.md` (says the CSV isn't stored in the repo) with the fact that a snapshot currently is — either remove the tracked CSV (`.gitignore` now correctly excludes future changes to it) or update the doc to reflect that a snapshot is intentionally kept.
- The `STAGE` bucketing gap is fixed in the app (`GET /api/kpis` groups dynamically, so `Undeveloped` and `Shut` are included) but `SQL/05_portfolio_summary.sql` itself still only buckets 4 of 6 stages — left as-is since that file is kept for reference/lineage, not actively used by the app.
- Decide whether to keep `POWER_BI/wa_mining_dashboard_v1.pbix` (superseded by v2) or remove it.
- Remove or repurpose the legacy `image.png` / `image-1.png` at the repo root now that screenshots live under `POWER_BI/screenshots/`.

## Related Experiments

- **[prototypes/unity-shift-supervisor-demo/](prototypes/unity-shift-supervisor-demo/)** — a small, separate Unity/C# prototype: a single-scene 3D view of a handful of the same mining sites, colored by stage, clickable for details. Built to explore what a spatial/XR-adjacent visualization direction could look like, and to demonstrate picking up the Unity/C# stack. **Not part of the analytics pipeline or the FastAPI/React app** — no shared code, no networking between them, different tech stack entirely. See its own README for exact scope (deliberately no backend, auth, multiplayer, or headset integration).

## Further Reading

**Current — start here for project status:**
- **[WA Mining Project Plan](WA_MINING_PROJECT_PLAN.md)** — the current feature roadmap: what's delivered, what's next, and the reasoning behind the sequencing. Replaces the old Notion "7-Day Project Plan" below, which can't be kept in sync from this repo.
- [JIRA_BACKLOG.md](JIRA_BACKLOG.md) — the sprint/ticket-level breakdown of the same roadmap, mirroring the live [WMDP2 Jira board](https://tonynguyen1996jb.atlassian.net/jira/software/projects/WMDP2/boards/73/backlog) (41 issues: 5 Epics, 19 Stories, 17 Subtasks, across 3 sprints).

**Historical (external, optional)** — planning docs from when this was scoped as a single-sprint BA/analytics portfolio piece, before it grew into the full-stack app described above. Superseded by the two docs above for anything current, kept only for the original framing:
- [Notion Case Study](https://www.notion.so/WA-Mining-Operations-Dashboard-Business-Analyst-Portfolio-Project-35fd7e4273f0809ba6cecc2f77d9aa5f)
- [7-Day Project Plan](https://www.notion.so/7-day-Project-Mining-Plan-35fd7e4273f08090aa5ad18388ff8202) — superseded by [WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md)
- [Portfolio Instructions](https://www.notion.so/WA-Mining-Portfolio-Instructions-363d7e4273f08052844def6827925a8c)
