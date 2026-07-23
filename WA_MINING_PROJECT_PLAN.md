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

### 1.11 Cleaned-data pipeline consolidation — ✅ Done (2026-07-19)
**Why:** A user reported the exported CSV looked "uncleaned" (raw-looking `lga_name` values). Investigation found the currently-running app's data and the CSV export were already byte-identical and fully clean (zero suffix artifacts across all 421 rows, verified against the raw source and against `seed.py`'s cleaning logic) — but it also surfaced a real structural risk worth closing regardless: the app's cleaning rules existed in two places (the original SQL pipeline, and a hand-ported Python reimplementation in `seed.py`) that could in principle drift apart, even though they hadn't. Rather than leave that risk in place, the SQL pipeline was run for real and its output made the single source of truth.
- [x] Closed a real gap this required: `SQL/02_create_clean_table.sql` and `SQL/03_insert_cleaned_data.sql` were missing `title`/`short_title` entirely (already-known, already-documented in the README) — added (TRIM-only, no title-casing, since these are already-authored proper names, not categorical fields)
- [x] Ran `SQL/01`→`05` for real, in an isolated scratch database (never the app's own `wa_mining` DB) — all 5 scripts succeeded; `portfolio_summary`'s numbers (421/356/261/74/40/10/229/158/33) matched the README's already-published business context exactly
- [x] Exported the resulting `sites` table to `DATABASES/Cleaned_Mining_Data/Major_Resource_Projects_Cleaned.csv` — a new, git-tracked artifact (matches the existing precedent of committing `DATABASES/raw/`'s snapshot, for the same reason: `seed.py` needs it present to run out of the box)
- [x] Diffed this SQL-cleaned output against the live app's Python-cleaned data: 421 rows × 14 columns, **zero mismatches** — proof the two implementations were already equivalent, not just an assumption
- [x] Rewrote `seed.py` to load this pre-cleaned CSV directly, deleting its own `_title_case`/`_clean_region`/`_clean_lga` functions — the cleaning rules now exist in exactly one place (`SQL/03`), not two
- [x] Re-seeded the live app from the new source and re-verified: all pages (Dashboard/Sites/Map/Site detail), `/api/kpis`, `/api/sites/{code}`, and `/api/sites/export` all still correct, zero console errors, all 33 backend + 34 frontend tests still passing
- [x] Caught and fixed a `SyntaxWarning` (an unescaped `\c` in a docstring) via `python -W error` before it could reach CI
- [x] Documentation updated everywhere this touches: root README (System/Workflow Summary diagram, Setup/How to Run, Repository Structure, Key Engineering Decisions, two stale Future Improvements bullets removed), `backend/README.md` (Seeding section, structure tree), and a full rewrite of `DATABASES/README_database.md` (previously inaccurate — said the CSV wasn't stored in the repo when a snapshot already was; now correctly documents both committed files and how to regenerate the cleaned one)

### 1.12 Human-readable CSV export headers — ✅ Done (2026-07-19)
**Why:** The follow-up round of the 1.11 report resolved the remaining confusion precisely: the exported *values* were clean, but the *header row* still used the database's snake_case attribute names (`lga_name`, `target_group_name`) — and to a spreadsheet user, schema-style headers read as "raw data" even when every value beneath them is clean. The user confirmed the values were fine once the "Shire Of X" prefix format was shown to be their own SQL rule's intended output; what they actually wanted was headers in the app's own vocabulary. Two supporting hardenings came out of the same investigation before the labels: `Cache-Control: no-store` on the export (no cache directives at all previously — the exact gap that could make a server-side data fix look broken client-side), pinned by a regression test.
- [x] `EXPORT_COLUMN_LABELS` in `portfolio_service.py`: an explicit column→label mapping using the UI's own vocabulary — "Site Code", "Project", "Site Title", "Commodity", "Local Government Area", "Active" — matching the site detail page and table headers, so an exported file reads like the app, not like the schema
- [x] Model attribute names stay snake_case; only the CSV's header row (presentation) changes — the JSON API is untouched, so no frontend or client-code changes ripple out
- [x] Tests updated + extended (35 backend total): a completeness guard (`set(EXPORT_COLUMN_LABELS) == set(EXPORT_COLUMNS)`, so adding a column without a label fails in CI instead of KeyErroring at request time), a header-content test asserting `lga_name` is absent and "Local Government Area" present, and the existing escaping/route tests re-keyed to the labels
- [x] Verified live: `curl` on the running stack shows the labeled header on filtered and unfiltered exports; values unchanged

### 1.13 Dashboard insights & provenance — ✅ Done (2026-07-19)
**Why:** The Dashboard had visible blank space below its three charts, and a documentation-first brainstorm found the strongest candidates were things the docs had described all along but the UI never showed: `lga_name` (the most carefully cleaned field in the dataset — the entire suffix-handling saga — displayed nowhere but the detail page) and the site-vs-project grain (Key Engineering Decision #1, the reason "421 sites / 356 projects" appears in every doc, invisible in the app). Chosen set was 1-2-3-5 from a six-option brainstorm; the two held back (mines-by-subtype, stage×commodity stacked) are parked below.
- [x] `/api/kpis` gains `by_lga` (top 10 only — 65 distinct LGAs would swamp a chart; the rest stay reachable via the sites list) and `top_projects` (multi-site projects only, `HAVING count >= 2` — listing single-site projects would just restate the sites list; `project_code` tiebreaker for deterministic ties), both respecting the same filters as every other breakdown
- [x] Clickable chart bars: stage/commodity/region bars navigate to `/sites` pre-filtered to that value — the URL-sync feature (1.7) is what makes each destination a shareable link. The synthetic "Unspecified" bucket renders inert (it stands for NULL, which `/sites` can't filter on), and the LGA chart has no link field at all until a real LGA filter exists
- [x] "Projects with the most sites" panel with a one-line grain explainer ("that's why 421 sites roll up to 356 projects"), each row linking into a searched Sites view — to be upgraded to a real `project_code` filter link when 2.1 (Related sites) lands
- [x] Data-provenance strip: DMIRS source link, May 2026 snapshot date, CC BY 4.0, dataset shape (421/356/10 regions/65 LGAs), and a data-dictionary link — everything sourced from `data_dictionary.md` and the README's Data Source section, now visible in the product itself
- [x] Tests: 6 backend (`test_kpis.py` — first direct `/api/kpis` coverage: totals, ordering, NULL bucketing, multi-site-only + filter behavior; fixture gained its first multi-site project) and 3 frontend (`sitesLinkForBreakdown` round-trip/encoding/Unspecified-null)
- [x] Verified end-to-end via Playwright (the Browser pane's inactive tab never runs Recharts' entry animation, so bars don't exist there to click): stage-bar click lands on `/sites?stage=Operating`, LGA bars confirmed inert, project links navigate with correct encoding; dashboard screenshot regenerated (full-page) so the README shows the new layout

#### Parked from the same brainstorm (💡, unscheduled)
- Mines-by-subtype breakdown (`SUB_TYPE` is documented but never aggregated anywhere)
- Stage × commodity stacked composition (two-dimension KPI query + stacked bars)
- An LGA filter on `/sites` — would also let the LGA chart's bars become clickable like the other three

### 1.14 Related sites by project — ✅ Done (2026-07-19, WMDP2-65)
**Why:** The data model's core insight (one project can have multiple sites — mine, processing plant, port) wasn't visible anywhere in the UI. A site detail page for a Waroonga site didn't show that "Agnew - Emu" has two more.
- [x] Design decision the plan left open, resolved in favor of the **`project` filter on `/api/sites`** over a dedicated `/related` endpoint: one mechanism serves both the detail page's related-sites section *and* the dashboard's top-projects links, and it inherits URL sync, sorting, and CSV export for free through the shared `_apply_filters` pipeline (`?project=J00098` is now a shareable, sortable, exportable view). Filters by `project_code` (the stable identifier), not title. Added to `/api/kpis` too, keeping the "same filter params everywhere" invariant intact
- [x] `SiteDetailPage`: a "Related sites in this project" section listing siblings (self excluded — it's already the page heading), each linking to its own detail page, plus a "View all N sites in this project →" link into the project-filtered sites view. A failed related-fetch degrades to the section not rendering, never an error state — related sites are supplementary
- [x] Edge case as planned: a single-site project (most of them) renders **no section at all**, not an empty heading — pinned by test
- [x] The dashboard's top-projects links upgraded from the interim `?search=<title>` to real `?project=<code>` links, as 1.13 promised
- [x] `FilterBar` renders an active project filter as a dismissible chip ("Project: J00098 ✕") — the filter has no dropdown (356 projects isn't dropdown material; it arrives via links), and an active-but-invisible filter would make the shortened list look broken
- [x] Tests: 4 backend (service filter + AND-composition, route param, export inherits the filter) and 4 frontend (URL parsing, related-sites rendering with self-exclusion, view-all href, single-site renders nothing) — `SiteDetailPage`'s first-ever test file
- [x] Verified end-to-end via Playwright against live data: Waroonga detail → 2 siblings listed (self excluded) → sibling click navigates → view-all lands on `/sites?project=J00098` with the chip and exactly 3 sites → chip dismissal clears → dashboard links carry `?project=` → single-site Abra Underground (J00545, confirmed 1 site) renders no section

### 1.15 End-of-sprint code review + immediate fixes — ✅ Done (2026-07-20)
**Why:** Sprint-close review of the full July 18–19 delivery (`06bda5a..afe574c`), strict and evidence-based: every finding carries file/line evidence, and one suspected issue (a stale-closure risk in `SitesPage`'s URL-sync effect) was investigated and dismissed rather than reported. Outcome: no critical or security-class issues; three confirmed fixables, four monitored risks, six named test gaps.
- [x] **C1 fixed** — `breakdown()` in `portfolio_service.py` ordered by count only, violating the file's own documented determinism convention (`_apply_order`'s `site_code` and `top_projects`' `project_code` tiebreakers). With `by_lga`'s `LIMIT 10`, tied LGAs could arbitrarily enter/leave the dashboard chart between identical requests. Fix: `col.asc().nulls_last()` secondary order + a tie-pinning test asserting the single valid ordering of `by_stage` and `by_site_type` (both contain deliberate ties in the fixture)
- [x] **C2 fixed** — `search` passed user-typed `%`/`_`/`\` to `ILIKE` as wildcards: searching `_` matched every record, `100%` over-matched, and the CSV export inherited the wrong rows through the shared pipeline. Fix: escape all three metacharacters (backslash first) with `escape="\\"` + three literal-matching tests, including `search="_"` → 0 (previously would have been all rows)
- [x] Backend suite now 47 tests; live-API re-verification deferred to next stack start (Docker not running in the review session — the pinning tests and CI cover both fixes; `ilike(escape=)` and the tiebreaker compile identically on SQLite/Postgres)
- [x] Everything not fixed on the spot logged into the plan (as then-sections 2.1/2.2 — delivered the same day as 1.16/1.17 below) and on the board — no findings live only in a chat transcript

### 1.16 Data-refresh guardrails — ✅ Done (2026-07-20, WMDP2-68)
**Why:** Sprint-review finding C3 + risks R1–R3, all one family: the app hardcodes dataset facts and shape assumptions that a refresh of `DATABASES/raw/` won't touch. None were live bugs; every one becomes a bug the first time the data is refreshed. Shipped as three guardrails — a checklist for the human, a serializer guard for the export, and seed-time warnings for the shape assumptions — so the refresh path fails loud instead of drifting silent.
- [x] C3: an "After refreshing: what else to update" checklist appended to `DATABASES/README_database.md` — watch the seed output for warnings, then the Dashboard provenance strip's hardcoded shape/date, the root README's Business Context counts, `data_dictionary.md`'s snapshot date, screenshots, and a full backend test run
- [x] R1 resolved as **prefix-quote, not won't-fix**: `_neutralize_formula_cell` in `portfolio_service.py` prefixes `'` onto text cells starting `=`/`+`/`-`/`@`/tab/CR, the classic CSV-injection vector when an export opens in Excel/LibreOffice. Only `str` cells are touched — longitude/latitude are floats, and neutralizing them would corrupt every southern-hemisphere latitude (they all start with `-`). A full-column scan proved the current 421-row snapshot has **zero** affected cells, so today's export is byte-identical; the guard exists for the first refresh that isn't
- [x] R2: `_dataset_shape_warnings` in `seed.py` — deliberately warnings, not errors (the rows are valid; it's frontend constants that need revisiting, and blocking the seed would hold the app hostage to a display-layer cap): rows > `MAP_PAGE_SIZE` (500 — the map fetches one page and silently drops the rest) and any project > `RELATED_FETCH_SIZE` (100 — the detail page's related-sites fetch), naming the offending project codes
- [x] R3: the same function warns when one `project_code` carries more than one distinct `project_title` — `top_projects` groups by (code, title), so title drift would split a real project into undercounted rows
- [x] Tests: +9 backend — 2 in `test_export.py` (trigger cells neutralized, including tab-prefixed; ordinary text and negative float coordinates untouched) and 7 in a new `test_seed_guardrails.py` (no-warnings baseline at the real dataset's shape, warning past the map cap but not at exactly 500, oversized project named, title drift, NULL project fields not counted as drift, warnings accumulate) — the first test coverage of anything in `app.db.seed`

### 1.17 Platform hygiene — ✅ Done (2026-07-20, WMDP2-69)
**Why:** Two incident-justified carry-overs — the 2026-07-18 npm 10/11 lockfile-skew CI failure, and the literal-U+FEFF paste hazard, which by shipping time had recurred **four** times (the fourth landed while writing this very story, see below) — plus review risk R4.
- [x] One Node major everywhere: `frontend/.nvmrc` (24), `engines: { "node": "24.x" }` in `package.json`, and CI's `node-version` bumped 20 → 24 — dev (Node 24 / npm 11.9) and CI now agree by construction, which is the durable fix the lockfile incident pointed at. Resyncing the lockfile under npm 11 removed the 27 platform-specific entries the npm-10 regeneration had added (the mirror image of the original incident — the two npm majors literally cannot agree on this file, which is why pinning is the fix). Verified the way the incident taught: full `npm ci` from the new lockfile (exit 0) + suite + build, under the same npm major CI now runs
- [x] CI gains a `hygiene` job that fails on any literal U+FEFF in tracked source files (`*.py/.ts/.tsx/.css/.html/.yml/.json/.md`; CSVs exempt — the raw DMIRS download legitimately begins with a BOM). **Validated the hard way:** while writing the job's own comment text, a literal U+FEFF landed in `ci.yml` (occurrence #4, same invisible-paste mechanism as the other three), was caught by running the guard's grep locally before commit, and fixed at codepoint level — the exact loop the job now automates on every push, demonstrated on itself
- [x] R4: an `/api`-wide `Cache-Control: no-store` middleware in `main.py` for every response that doesn't set its own — the same staleness argument that put the header on the export in 1.12 (after a re-seed, a cached JSON payload shows old data with no error anywhere, and this dataset is small enough that re-fetching always beats debugging staleness). Route-set headers win (the export keeps its own, no double-stamping); `/health` and `/docs` sit outside `/api` and stay unstamped on purpose
- [x] Tests: +4 backend in a new `test_cache_headers.py` (JSON endpoints and even `/api` 404s stamped; the export's route-level header not duplicated; `/health` untouched as proof of scoping). Suite now **60 backend + 41 frontend**, both green, plus `tsc -b && vite build` clean

### 1.18 About page with portfolio referral — ✅ Done (2026-07-21)
**Why:** The owner's personal portfolio site went live on Netlify, and the app had no path from "recruiter exploring the demo" to "the person who built it." A four-option brainstorm (persistent footer, dedicated page, provenance-strip author line, header chip) landed on the dedicated page: the footer was the lowest-effort referral, but the page carries the whole case-study narrative *inside the product* — a visitor never has to find the GitHub README to understand what they're looking at. Explicit design request: engaging, blue/cyan tone, clean.
- [x] `/about` route + header nav link. The page is deliberately its own visual moment: a scoped `.about` accent palette (deep blue → cyan, `--about-blue`/`--about-cyan`) marks the boundary between the data views (warm `--accent`) and the page about the project itself — gradient hero with dataset-fact chips, cyan-dotted journey timeline (SQL pipeline → Power BI → API → this app), stack cards, and a tinted author card
- [x] The referral itself: "Visit my portfolio" (primary button → https://vynguyen-perth.netlify.app, URL verified against the portfolio repo's own README) and "Source on GitHub" (secondary), both `target="_blank" rel="noreferrer"` per house convention. URLs live in source constants, not env vars — they're content, identical in every environment, and a typo should fail a test rather than a deploy
- [x] Dataset facts on the hero reuse the provenance strip's numbers (421/356/10) — both surfaces are already covered by the 1.16 refresh checklist's "search the repo for 421" instruction, and a test pins the number's presence so that search keeps finding the page
- [x] Tests: +5 (`AboutPage.test.tsx`) — hero + author render, both external links' exact href/target/rel, internal explore links to `/`, `/sites`, `/map`, and the dataset-fact pin. Frontend suite 41 → 46
- [x] Visual verification caught a real bug before commit: `.about a` (specificity 0-1-1) overrode `.about-button-primary`'s white text (0-1-0), rendering the primary button blue-on-blue — invisible label. Fixed by promoting the button selectors to `a.about-button-*`; the secondary button had only looked correct by coincidence (its intended color equaled the override). Full-page Playwright screenshots before/after; `screenshots/about.png` added to the README set

### 1.19 Netlify production deployment + the "Page Not Found" postmortem — ✅ Done (2026-07-21)
**Why:** The owner deployed via Netlify's agent runner (prompt: "deploy the app onto the domain of this project") and then hit **Page Not Found** on the live site. Diagnosis, the fix, and the hardening below.
- [x] **Postmortem — root cause was branch topology, not the app.** The Netlify agent put all of its work (the `netlify.toml`, a TypeScript Functions port of the API, migrations for a managed Netlify Postgres) on branch `agent-localhost-to-project-domain-c90c` and opened PR #2 — which was never merged. Netlify builds production from `main`, and `main` had none of that config, so production had nothing valid to publish. Verified both directions before touching anything: `wa-mining.netlify.app` → HTTP 404, while the PR's own deploy preview served the app. Lesson recorded: **an agent-run "deployment" isn't deployed until its PR lands on the production branch** — the success message describes the preview, not production
- [x] PR #2 reviewed before merging: faithful endpoint ports (export routed before the `:site_code` match — the same route-order guard the Python side pins by test — sort allowlist, page-size clamp at 500), seed migration carrying exactly 421 rows, SPA fallback without `force` so `/api/*` Functions win. Merged as a merge commit preserving the agent's full description
- [x] Review findings fixed in the follow-up commit: a **literal U+FEFF in `sites.mts`** (the CSV BOM prepend — occurrence #5 of the invisible-paste hazard, this time from another agent's code) replaced with the `"\ufeff"` escape, and the CI hygiene guard extended with `*.mts`/`*.cts`/`*.toml`, which its `*.ts` pattern does not match; **`NODE_VERSION = "24"` pinned in `netlify.toml`** — Netlify can't see `frontend/.nvmrc` from a repo-root base, and its default image's npm 10 rejecting our npm-11 lockfile would have been the 2026-07-18 incident on a third platform
- [x] Architecture stance documented in the README: the Functions are a **hosting adapter, not the canonical API** — Python/FastAPI (60 tests, CI, Docker, the AWS runbook) remains the source of truth, and contract-testing the Functions against the backend suite's expectations is queued in the roadmap
- [x] Live verification after the production build: see the verification record in this section's commit message and the README's live-demo link

---

## 2. Next up — Sprint 4 shaping

The 2026-07-20 deploy-now-vs-wait decision **resolved itself a day later**: the owner ran Netlify's agent, and after the 1.19 postmortem/merge the app is live at wa-mining.netlify.app. WMDP2-21 (automated CD) has since closed as overtaken (Netlify rebuilds `main` on every push) and WMDP2-20 re-scoped to the custom-domain half only — see the backlog's 2026-07-21 sync log.

**Sprint 4 is live (started 2026-07-23, runs to 16 Aug)** with the owner's picked scope executed on the board: **WMDP2-76** (the Netlify-Functions contract-testing story, full differential-testing scope in its description) and **WMDP2-20** (custom domain). The sprint goal is recorded in Jira.

**The Unity track now runs beside the sprints, not inside them**: epic **WMDP2-72 Unity Simulation Showcase** (created 2026-07-22) tracks the C#/Unity work on `feature/unity-shift-supervisor-v2` at 2–3 h/week — discovery and the approved Inspection Round spec live on that branch. Shipped so far: the live WebGL demo at **wa-mining-unity.netlify.app** (WMDP2-73), the About page's referral card (WMDP2-75), and — I1 on 2026-07-23, I2 on 2026-07-24 — the complete **Inspection Round** (WMDP2-74 Done): the pure-C# scenario core with 23 green EditMode tests behind the project's first assembly definitions, now driven by a playable loop (briefing → per-site decisions with flag reasons → end-of-shift report → restart) live at the same URL. Next: the owner's call on the spec's I2 milestone merge (branch → main), then increments I3/I4.

---

## 3. Platform / infrastructure roadmap

Carried over from the README's Future Improvements, organized here as actionable items rather than a flat list:

- 💡 **Execute the AWS deployment** — `DEPLOYMENT.md` is ready; blocked only on credentials. Since 1.19 the live demo runs on Netlify instead; AWS remains the documented path for running the canonical FastAPI/Postgres/nginx stack in production.
- 💡 **Contract-test the Netlify Functions** — the TS functions under `netlify/functions/` re-implement the API the backend suite pins (sort allowlist, wildcard escaping, tie ordering, export shape). Run the same HTTP expectations against `netlify dev` in CI so the two implementations can't silently drift (see 1.19's architecture stance: Python stays canonical).
- 💡 **Expand test coverage** — the suite has grown with every feature (60 backend + 46 frontend tests as of 1.18) but is focused, not exhaustive. Remaining gaps, per the sprint review: `/api/meta/filters` (content — it now has an incidental cache-header check), `MultiSelect`, the URL-sync effects in `SitesPage`/`MapPage`, `App.tsx`'s shortcut wiring (Ctrl/Cmd+K toggle, window-level Escape), and `FilterBar`'s project-chip dismissal. (`/api/kpis`, once on this list, gained direct coverage in 1.13; `app.db.seed` gained its first coverage in 1.16.)
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
