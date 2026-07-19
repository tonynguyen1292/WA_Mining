# Jira Backlog Plan — WMDP2

This is the Epic → Story → Subtask breakdown for the [WMDP2 Jira project](https://tonynguyen1996jb.atlassian.net/jira/software/projects/WMDP2/summary), organized into sprints, aligned to what's actually in this repository (both what's already built and what's ahead).

**Live in Jira** as WMDP2-1 through WMDP2-41 (5 Epics, 19 Stories, 17 Subtasks), imported via `jira_backlog_import.csv` and organized into three real Sprint objects:
- **WMDP2 Sprint 1** (Platform Foundation) — WMDP2-6, 7, 8, 9
- **WMDP2 Sprint 2** (Polish, Production Build & CI + Multi-Select Filtering) — WMDP2-10 through 16
- **WMDP2 Sprint 3** (AWS Cloud Deployment) — WMDP2-17, 18, 19
- **Backlog** (unscheduled future work) — WMDP2-20 through 24, correctly left without a sprint

Note on the import itself: the CSV importer's own Sprint-name matching didn't work (the sprint names in the CSV didn't match any existing sprint), and its Sub-task import ran on a slower deferred path that looked stalled but wasn't — it finished ~20 minutes later and created a duplicate, unparented copy of every subtask. That duplicate set was deleted, and Sprint assignment was done afterward via bulk-edit instead of the CSV. Worth knowing if you re-run a CSV import against this project.

## Sprint 1 — Platform Foundation (completed, for the record)

**Epic: Full-Stack Platform Foundation**
- Story: Backend API foundation — FastAPI + SQLAlchemy + PostgreSQL, `/health`, `/api/sites`, `/api/kpis`, `/api/meta/filters`
  - Subtask: Set up FastAPI app structure, config, DB session
  - Subtask: Define `Site` model and Pydantic schemas
  - Subtask: Implement filtering + KPI aggregation service layer
- Story: Database seed pipeline — port `SQL/01`–`03` cleaning rules into Python
  - Subtask: Port TRIM/INITCAP/region+LGA cleaning rules from SQL to `seed.py`
  - Subtask: Add `title`/`short_title` back into the schema for UI display
- Story: React frontend — Dashboard, Sites explorer, Site detail
  - Subtask: Dashboard page with KPI cards + breakdown charts
  - Subtask: Sites page with filter bar + paginated table
  - Subtask: Site detail page
- Story: Local dev environment — Docker Compose (Postgres + backend)

## Sprint 2 — Polish, Production Build & CI (completed)

**Epic: Production Readiness**
- Story: Loading/empty/error states across Dashboard and Sites
- Story: Responsive layout pass (mobile/tablet breakpoints)
- Story: Production Docker build — multi-stage frontend (node → nginx), `docker-compose.prod.yml`
- Story: CI pipeline — backend lint (`ruff`) + compile check, frontend typecheck + build

**Epic: Multi-Select Filtering**
- Story: Backend — accept repeated query params for commodity/region/stage/site_type, filter with `IN`
- Story: Frontend — `MultiSelect` checkbox-dropdown component, wired into `FilterBar`
- Story: Seed script data validation — row-count floor, duplicate `SITE_CODE` check, post-insert count verification

## Sprint 3 — AWS Cloud Deployment (current)

**Epic: AWS Cloud Deployment**
- Story: Harden the app for public deployment
  - Subtask: Add nginx reverse proxy for `/api`, `/health`, `/docs` (done — see `frontend/nginx.conf`)
  - Subtask: Remove backend's public port mapping in `docker-compose.prod.yml` (done)
  - Subtask: Write deployment runbook (done — `DEPLOYMENT.md`)
- Story: Provision AWS infrastructure
  - Subtask: Confirm Free Tier eligibility; set a $1 AWS Budget alert
  - Subtask: Launch EC2 instance (t2.micro/t3.micro) with a locked-down security group (22 from my IP, 80 from anywhere)
  - Subtask: Install Docker + Compose plugin on the instance
- Story: Deploy and verify
  - Subtask: Clone repo onto the instance, set `VITE_API_BASE_URL`/`CORS_ORIGINS`
  - Subtask: Build and start `docker-compose.prod.yml`, seed the database
  - Subtask: Verify Dashboard, `/health`, and `/docs` are reachable at the instance's public IP
- Story: Teardown plan documented (done — `DEPLOYMENT.md` Teardown section) so nothing keeps billing after the demo

## Backlog — Future Work (not yet scheduled)

**Epic: Post-Deployment Hardening**
- Story: TLS + custom domain (e.g. Let's Encrypt via certbot in the nginx container)
- Story: Automated CD — deploy to EC2 on push to `main`, instead of the current manual runbook
- ~~Story: URL-synced filters and pagination, so filtered views are shareable links~~ — **done, not yet reflected in the live Jira board.** Shipped in the app: `/sites` (filters + page + sort) and `/map` (filters) both read/write their state to the URL query string. See [WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md) for the design writeup. This board entry should be moved to Done in Jira to match.
- ~~Story: Automated test suite — backend (pytest) and frontend (component/integration tests); CI currently only lints/builds~~ — **done, not yet reflected in the live Jira board.** A starter suite shipped: 23 backend tests (pytest, in-memory SQLite) covering sort/filter logic and the `/api/sites` route, 24 frontend tests (Vitest + RTL) covering `urlFilters` and `SitesTable`'s sort-cycle, both now required CI steps. Not exhaustive -- see WA_MINING_PROJECT_PLAN.md's platform roadmap for what's still uncovered. This board entry should be moved to Done in Jira to match.
- Story: Path to managed infrastructure if traffic grows — RDS instead of containerized Postgres, horizontal scaling

**Epic: Product Polish**
- ~~Story: Command palette / global search (Ctrl/Cmd+K)~~ — **done, not yet reflected in the live Jira board.** Shipped as a new, out-of-backlog feature (not originally scoped in this file) -- see WA_MINING_PROJECT_PLAN.md section 1.9. This board entry should be added and moved to Done in Jira to match.
- ~~Story: CSV export of the filtered Sites view~~ — **done, not yet reflected in the live Jira board.** `GET /api/sites/export` + an "Export CSV" link on `/sites`; full filtered+sorted result set, shared query path with the table so they can't drift -- see WA_MINING_PROJECT_PLAN.md section 1.10. This board entry should be added and moved to Done in Jira to match.
- ~~Story: Consolidate the cleaning pipeline onto one implementation~~ — **done, not yet reflected in the live Jira board.** Triggered by a user bug report about the CSV export (investigation found the running app's data was already clean; the real, separate issue was the SQL pipeline and `seed.py`'s Python port being two implementations of the same cleaning rules). `SQL/01`-`05` now run for real to produce `DATABASES/Cleaned_Mining_Data/`, which `seed.py` loads directly -- see WA_MINING_PROJECT_PLAN.md section 1.11. This board entry should be added and moved to Done in Jira to match.

## How this got into Jira

Via **System → External System Import → CSV** (`jira_backlog_import.csv`, same directory), using a `Work item Id` column to make Sub-task → Parent linking resolve reliably (Jira's CSV importer matches `Epic Link` against `Epic Name` by value directly, but `Parent` needs real ID references within the same file, not text matching). Sprint assignment was done as a separate bulk-edit pass afterward, since the importer doesn't create new sprints from a CSV's `Sprint` column values.

If re-running this CSV against a fresh project: watch for the "Import Work items" step reporting near-complete (e.g. 59%) faster than it's actually finished — the Sub-task rows can process on a slower deferred path and land 15-20 minutes later, which reads as stalled but isn't. Wait for it to fully finish before manually recreating anything, or you'll get duplicates.
