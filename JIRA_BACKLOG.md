# Jira Backlog Plan — WMDP2

This is a proposed Epic → Story → Subtask breakdown for the [WMDP2 Jira project](https://tonynguyen1996jb.atlassian.net/jira/software/projects/WMDP2/summary), organized into sprints, aligned to what's actually in this repository (both what's already built and what's ahead).

**Not yet created in Jira.** I don't have authenticated access to this Jira instance (no connected browser session, and I won't log in with a password on your behalf), so this exists as a plan and an importable CSV (`jira_backlog_import.csv`, same directory) rather than live issues. See "How to get this into Jira" at the bottom.

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
- Story: URL-synced filters and pagination, so filtered views are shareable links
- Story: Automated test suite — backend (pytest) and frontend (component/integration tests); CI currently only lints/builds
- Story: Path to managed infrastructure if traffic grows — RDS instead of containerized Postgres, horizontal scaling

## How to get this into Jira

I can't create these directly (see the access note above). Two options:

1. **Manual entry** — use this document as the source; takes longer but gives you full control over exact wording/estimates.
2. **CSV import** — `jira_backlog_import.csv` in this same directory is formatted for Jira's CSV importer (**Project settings → Import CSV**, or **System → External System Import → CSV** depending on your Jira plan). Jira's importer requires you to map columns interactively (Issue Type, Summary, Epic Link, Sprint, etc.) — the Epic Link column matches against Epic Name by value during that mapping step, not a real key, since none exist before import. Subtask-to-parent linking via CSV is the least reliable part of Jira's importer and may need manual fixup after import (I recommend checking each Epic's children once the import completes before trusting the CSV blindly).
3. Alternatively — if you connect a Chrome browser with an active Jira session (or grant Jira API access), I can create these directly through the UI or API instead of via CSV.
