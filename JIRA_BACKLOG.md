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

**Epic: Post-Deployment Hardening** (WMDP2-5, In Progress)
- Story: TLS + custom domain (WMDP2-20) — e.g. Let's Encrypt via certbot in the nginx container
- Story: Automated CD (WMDP2-21) — deploy to EC2 on push to `main`, instead of the current manual runbook
- ~~Story: URL-synced filters and pagination (WMDP2-22)~~ — **Done, on the board.** Shipped in the app: `/sites` (filters + page + sort) and `/map` (filters) both read/write their state to the URL query string. See [WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md) section 1.7.
- ~~Story: Automated test suite (WMDP2-23)~~ — **Done, on the board.** Backend pytest + frontend Vitest/RTL suites, both required CI steps. See WA_MINING_PROJECT_PLAN.md section 1.8 and the platform roadmap for what's still uncovered.
- Story: Path to managed infrastructure if traffic grows (WMDP2-24) — RDS instead of containerized Postgres, horizontal scaling

Also parked here from Sprint 3 (2026-07-19): **WMDP2-18 Provision AWS infrastructure** and **WMDP2-19 Deploy and verify on EC2**, both flagged in Jira as blocked on AWS credentials — the `DEPLOYMENT.md` runbook is ready to execute the moment an account is configured. Moved out of the active sprint so it only carries workable scope.

**Epic: Product Polish** (WMDP2-59, In Progress — created on the board 2026-07-19)
- ~~Story: Sortable table columns~~ — Done, on the board. See WA_MINING_PROJECT_PLAN.md section 1.5.
- ~~Story: Map view~~ — Done, on the board. See section 1.6.
- ~~Story: Command palette / global search (Ctrl/Cmd+K)~~ — Done, on the board. See section 1.9.
- ~~Story: CSV export of filtered view~~ — Done, on the board (covers the export endpoint, header labels, and no-store caching). See sections 1.10 and 1.12.
- ~~Story: Cleaned-data pipeline consolidation~~ — Done, on the board. See section 1.11.
- ~~Story: Related sites by project (WMDP2-65)~~ — **Done, on the board** (transitioned in the same sitting the feature shipped). A `?project=` filter on `/api/sites` powers the detail page's related-sites section, the dashboard's project links, and project-scoped exports — see WA_MINING_PROJECT_PLAN.md section 1.14. With WMDP2-17 also Done, **Sprint 3's scope is now fully complete** — the sprint can be closed whenever you're ready (a ceremony call, left to you).

## Board reconciliation log (2026-07-19)

The board drifted while the repo shipped (every item above previously carried a "done, not yet reflected in the live Jira board" note). Reconciled in one pass, executed through the Jira UI:
- WMDP2-22 and WMDP2-23 transitioned to Done; Jira's built-in parent automation moved epic WMDP2-5 to In Progress on its own.
- Product Polish epic (WMDP2-59) created with five Done stories for the shipped-untracked features, plus WMDP2-65 (Related sites) into Sprint 3.
- The empty, never-started Sprint 1/2 shells were deleted (their stories WMDP2-6..16 keep their Done status; retro-dating fake sprint completions would have corrupted the record worse than absence does).
- WMDP2-18/19 moved from Sprint 3 to the backlog and flagged, so the active sprint no longer consists entirely of externally-blocked work.

## How this got into Jira

Via **System → External System Import → CSV** (`jira_backlog_import.csv`, same directory), using a `Work item Id` column to make Sub-task → Parent linking resolve reliably (Jira's CSV importer matches `Epic Link` against `Epic Name` by value directly, but `Parent` needs real ID references within the same file, not text matching). Sprint assignment was done as a separate bulk-edit pass afterward, since the importer doesn't create new sprints from a CSV's `Sprint` column values.

If re-running this CSV against a fresh project: watch for the "Import Work items" step reporting near-complete (e.g. 59%) faster than it's actually finished — the Sub-task rows can process on a slower deferred path and land 15-20 minutes later, which reads as stalled but isn't. Wait for it to fully finish before manually recreating anything, or you'll get duplicates.
