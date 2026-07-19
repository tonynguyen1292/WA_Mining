# WA Mining Project Plan

This is the current, git-tracked feature roadmap for the project — what's been built, what's next, and why, in priority order. It replaces the original **[7-Day Project Plan](https://www.notion.so/7-day-Project-Mining-Plan-35fd7e4273f08090aa5ad18388ff8202)** Notion document from when this was scoped as a single-sprint BA/analytics portfolio piece. That framing no longer matches reality: the project grew into a full-stack app (FastAPI + PostgreSQL + React) with its own live Jira backlog ([JIRA_BACKLOG.md](JIRA_BACKLOG.md), WMDP2-1 through WMDP2-41), and a Notion page that can't be updated from this repo was never going to stay in sync with that. This file can.

Relationship to the other planning docs, since there are now three and it's worth being explicit about which one to trust for what:
- **This file** — the feature-level roadmap: what's done, what's next, and the engineering reasoning behind sequencing. Start here.
- **[JIRA_BACKLOG.md](JIRA_BACKLOG.md)** — the sprint/ticket-level breakdown of the same work, mirroring the live WMDP2 Jira board. Use it for day-to-day task tracking.
- **[README.md](README.md)** — how to run the app, architecture, and key engineering decisions already made. Use it to get the app running or understand *why* something is built the way it is.

## How to read this document

Each feature has a **Status**, a one-line **Why**, and its constituent **Tasks**. Status values:
- ✅ **Done** — shipped and verified (see the file/PR it landed in)
- 🔜 **Next** — the next thing being built
- 📋 **Planned** — approved and sequenced, not yet started
- 💡 **Idea** — worth doing, not yet sequenced

---

## 1. Delivered

### 1.1 Full-stack platform foundation — ✅ Done
**Why:** The project started as a SQL pipeline + static Power BI dashboard. Turning it into a live, filterable app required a real backend and frontend, not just a reporting layer.
- [x] FastAPI backend: `/health`, `/api/sites`, `/api/kpis`, `/api/meta/filters` (`backend/app/`)
- [x] Database seed pipeline porting `SQL/01`–`03`'s cleaning rules into `backend/app/db/seed.py`
- [x] React + TypeScript + Vite frontend: Dashboard, Sites explorer, Site detail (`frontend/src/`)
- [x] Docker Compose for local dev (`docker-compose.yml`)

### 1.2 Production readiness pass — ✅ Done
**Why:** A working dev setup isn't a deployable one — needed a production build path and a safety net against regressions before adding more features.
- [x] Loading/empty/error states across Dashboard and Sites
- [x] Responsive layout pass (mobile/tablet breakpoints)
- [x] Production Docker build: multi-stage frontend (`node` → `nginx`), `docker-compose.prod.yml`
- [x] CI pipeline (`.github/workflows/ci.yml`): backend lint (`ruff`) + compile check, frontend typecheck + build

### 1.3 Multi-select filtering — ✅ Done
**Why:** A single-value filter per field (one commodity, one region at a time) doesn't match how someone actually explores a 421-site portfolio — comparing "Gold and Nickel across Goldfields-Esperance and Pilbara" needs multi-value filters.
- [x] Backend: repeated query params (`?commodity=Gold&commodity=Nickel`) mapped to SQLAlchemy `.in_()`
- [x] Frontend: `MultiSelect` checkbox-dropdown component wired into `FilterBar`
- [x] Seed script validation: row-count floor, duplicate `SITE_CODE` check, post-insert count verification

### 1.4 AWS deployment hardening (not yet executed) — ✅ Done (runbook), ⏸ execution blocked
**Why:** A Docker Compose stack that only runs on a laptop isn't a deployment. Needed the stack hardened for a public host and a documented, cost-gated path to actually put it on one.
- [x] nginx reverse proxy for `/api`, `/health`, `/docs` (`frontend/nginx.conf`)
- [x] Backend's public port mapping removed in `docker-compose.prod.yml`
- [x] Deployment runbook with an explicit cost/billing gate (`DEPLOYMENT.md`)
- [ ] **Blocked:** actual EC2 provisioning and deploy — requires AWS credentials this environment doesn't have configured. Runbook is ready to execute whenever those are available.

### 1.5 Sortable table columns — ✅ Done (2026-07-18)
**Why:** Users need to reorder the Sites table (e.g. "biggest to smallest by stage") without hand-editing filters — a standard table affordance the app was missing.
- [x] Backend: allowlisted `sort` query param (`SORTABLE_COLUMNS` in `backend/app/services/portfolio_service.py`), rejects unknown fields with HTTP 422 rather than passing a client string into `ORDER BY`
- [x] Stable tiebreaker (`site_code` ascending, always appended) so low-cardinality columns (stage, site_type) don't produce nondeterministic pagination
- [x] Explicit `.nulls_last()` on both directions, since Postgres's default NULL ordering flips with sort direction
- [x] Frontend: clickable column headers (`SitesTable.tsx`) with a ▲/▼ indicator, toggling asc/desc, bypassing the filter debounce (a header click is a discrete action, not a keystroke burst)

### 1.6 Map view — ✅ Done
**Why:** Approved as a stretch feature ahead of its original place in the sequence — a geographic view of the portfolio is a natural, high-value complement to the tabular Sites view, and Leaflet + free OSM tiles made it cheap to build.
- [x] `/map` route: all matching sites plotted via `react-leaflet`, colored by stage, WA-centered default view
- [x] Popup per site (title, stage, commodity, region, link to detail page)
- [x] Fixed: filter dropdowns rendering behind the map (`isolation: isolate` on `.map-container` — Leaflet's internal z-index values otherwise escaped its stacking context and beat the dropdown's)

### 1.7 URL-synced filters, pagination, and sort — ✅ Done (2026-07-18)
**Why:** Filtered/sorted/paginated views weren't shareable or bookmarkable, and a page reload silently discarded all of it — flagged as a known gap in the README's Future Improvements since the map view shipped.
- [x] `/sites` (filters + page + sort) and `/map` (filters) read their initial state from the URL on mount, supporting deep links and reloads
- [x] State → URL sync uses `history.replace`, not `push`, so rapid filter/pagination changes don't flood browser history — Back returns to the last real navigation, not the last keystroke
- [x] URL → state sync (via a "did I just write this" ref guard) correctly restores state on browser back/forward, without the two directions fighting each other
- [x] `api/client.ts` now surfaces the backend's actual validation message on HTTP 422 (e.g. an invalid `?sort=` value hand-typed into the URL) instead of a generic "is the API running?" — a failure mode that became reachable by real users once `sort` was URL-editable, not just UI-driven
- [x] Shared parsing/serialization in `frontend/src/utils/urlFilters.ts`, used by both `SitesPage` and `MapPage`

### 1.8 Automated test suite — ✅ Done (2026-07-18)
**Why:** Explicitly the project's most-cited gap (README's Future Improvements, this file's own platform roadmap, and the JIRA backlog all called it out) — CI caught lint/type/compile errors but nothing behavioral, on top of a growing amount of filter/sort/pagination logic that had zero coverage.
- [x] Backend (`backend/tests/`, pytest): an in-memory SQLite DB (pinned to a single connection via `StaticPool` -- otherwise each pool checkout opens a *new*, empty in-memory database) seeded with a small, hand-picked fixture set, covering `resolve_sort`'s allowlist/parsing, `list_sites`'s sort/tiebreaker/NULL-handling/filter-composition logic, and the `/api/sites` route's 422-on-invalid-sort behavior end-to-end
- [x] Frontend (`frontend/src/**/*.test.ts(x)`, Vitest + React Testing Library): `urlFilters.ts`'s parse/serialize/round-trip behavior, and `SitesTable`'s header click-cycle (ascending → descending → ascending, and starting fresh on a newly-clicked column)
- [x] Both wired into CI (`.github/workflows/ci.yml`) as a required step, not just something that exists locally — a test suite nobody runs isn't one

### 1.9 Command palette / global search — ✅ Done (2026-07-18)
**Why:** Chosen alongside the test suite as a same-day-safe, high-visibility feature -- purely additive (new component, one small `App.tsx` hook-in), reuses the existing `/api/sites?search=` endpoint with no backend changes, and reads as UX polish in the first 30 seconds of a live click-through.
- [x] `Ctrl`/`Cmd`+`K` opens a global search modal from any route (`frontend/src/components/CommandPalette.tsx`, mounted once in `App.tsx`); a "Search sites" button in the header is the mouse-accessible, discoverable entry point for the same action
- [x] Debounced search (150ms -- snappier than the 300ms filter-bar debounce, since instant feedback is the point of the feature) against up to 8 results
- [x] Full keyboard control: ↑/↓ to move the active result, Enter to navigate to that site's detail page, Escape or a backdrop click to close
- [x] Errors are logged to the console with a `[CommandPalette]` tag and shown inline, rather than failing silently
- [x] One real bug fixed during build: focus-on-open originally used a ref + `requestAnimationFrame`, which proved unreliable; switched to the `autoFocus` prop, which is the correct tool here since the `<input>` is genuinely unmounted/remounted each time the palette opens
- [x] Post-ship consistency review (2026-07-19) found and fixed two more: (1) reopening the palette briefly re-fetched and flashed the *previous* search's results, because the component stayed mounted while closed and the 150ms-debounced query outlived the reset — fixed structurally by mounting the palette only while open, which removes the whole stale-state class rather than guarding it; (2) Escape went dead if focus drifted to `<body>` (e.g. after clicking the non-focusable hint bar) — fixed by handling Escape at the window level in `App.tsx`. Palette now has its own test file (6 tests) covering search, keyboard flow, and the error path

### 1.10 CSV export of filtered view — ✅ Done (2026-07-19)
**Why:** Once someone has narrowed the portfolio down to exactly what they care about (e.g. "all Operating gold mines in the Goldfields"), the natural next step is taking that subset out of the app — into a spreadsheet, an email, a report attachment.
- [x] Server-side generation: `GET /api/sites/export` accepts the same filter + `sort` params as the list endpoint and returns `text/csv` as an attachment (`wa_mining_sites.csv`) — the *full* filtered result set, not one page of it
- [x] Zero drift by construction: the export reuses `_apply_filters` and a new shared `_apply_order` helper (extracted from `list_sites`), so the CSV is filtered and ordered by exactly the code path the table uses
- [x] Proper escaping via the stdlib `csv` writer — project titles in this dataset genuinely contain commas and quotes — plus a UTF-8 BOM so Excel on Windows opens it correctly
- [x] Route registered *before* `/{site_code}` with a regression test pinning that order — otherwise the path param captures `/export` as a site code and 404s
- [x] Row-cap decision (per the original plan note): none — the full dataset is 421 rows (~60KB); documented in `list_sites_for_export`'s docstring with the revisit condition
- [x] Frontend: an "Export CSV · N sites" link on `/sites` built from the same `debouncedFilters`/`sort` the table fetch uses; disabled state when the filter set matches zero rows
- [x] Tests: 10 backend (CSV escaping units + route behavior incl. filters/sort/422/route-order) and 4 frontend (export-URL serialization)

---

## 2. Next up (approved priority order)

### 2.1 Related sites by project — 🔜 Next
**Why:** The data model's core insight (one project can have multiple sites — mine, processing plant, port) isn't visible anywhere in the UI yet. A site detail page for "Boorara Open Pit" doesn't show that "Boorara / Horizon" also has other sites.
- [ ] Backend: either a new `GET /api/sites/{site_code}/related` endpoint, or expose `project_code` filtering on the existing `/api/sites` list endpoint and let the frontend reuse it
- [ ] Frontend: a "Related sites in this project" section on `SiteDetailPage.tsx`, linking to each sibling site
- [ ] Edge case: a project with only one site (most of them) should render nothing extra, not an empty "Related sites" heading

---

## 3. Platform / infrastructure roadmap

Carried over from the README's Future Improvements, organized here as actionable items rather than a flat list:

- 💡 **Execute the AWS deployment** — `DEPLOYMENT.md` is ready; blocked only on credentials.
- 💡 **Expand test coverage** — the suite (sections 1.8–1.10: 33 backend + 34 frontend tests) is focused, not exhaustive. `/api/kpis`, `MultiSelect`, and the URL-sync effects in `SitesPage`/`MapPage` still have no direct coverage.
- 💡 **Pin dev and CI to the same Node major** (`.nvmrc` + `engines`) — the durable guard against the npm 10 vs 11 lockfile-skew CI failure of 2026-07-18.
- 💡 **TLS + custom domain** — e.g. Let's Encrypt via certbot in the nginx container.
- 💡 **Automated CD** — deploy to EC2 on push to `main`, instead of the current manual runbook.
- 💡 **Bundle size** — `vite build` warns on a >500kB chunk (Leaflet + deps); consider code-splitting the map route with `React.lazy` so `/sites` and `/` don't pay for Leaflet on first load.
- 💡 **Path to managed infrastructure** if traffic ever justified it — RDS instead of containerized Postgres, horizontal scaling.

### Repo cleanup (small, no feature value, but noted so they don't get forgotten)
- Decide whether to keep `POWER_BI/wa_mining_dashboard_v1.pbix` (superseded by v2) or remove it.
- Remove or repurpose the legacy `image.png` / `image-1.png` at the repo root — superseded by `POWER_BI/screenshots/`.
- Reconcile `DATABASES/README_database.md` (says the CSV isn't stored in the repo) with the fact that a snapshot currently is committed under `DATABASES/raw/`.
- `SQL/05_portfolio_summary.sql` only buckets 4 of 6 `STAGE` values — already fixed in the app's own `/api/kpis` (dynamic `GROUP BY`), left as-is in the legacy SQL file since it's reference/lineage only, not executed by the app.

---

## 4. Superseded planning docs (historical, do not use for current status)

These were the original planning surface, from before this grew past a single-sprint scope. Kept linked from the README for the original framing, not for anything current:
- [Notion Case Study](https://www.notion.so/WA-Mining-Operations-Dashboard-Business-Analyst-Portfolio-Project-35fd7e4273f0809ba6cecc2f77d9aa5f)
- [7-Day Project Plan](https://www.notion.so/7-day-Project-Mining-Plan-35fd7e4273f08090aa5ad18388ff8202) — superseded by this file
- [Portfolio Instructions](https://www.notion.so/WA-Mining-Portfolio-Instructions-363d7e4273f08052844def6827925a8c)
