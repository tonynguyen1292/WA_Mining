# Jira Backlog Plan — WMDP2

This is the Epic → Story → Subtask breakdown for the [WMDP2 Jira project](https://tonynguyen1996jb.atlassian.net/jira/software/projects/WMDP2/summary), organized into sprints, aligned to what's actually in this repository (both what's already built and what's ahead).

**Live in Jira** as WMDP2-1..24 (the original import: 5 Epics, 19 Stories, 17 Subtasks) plus WMDP2-59..75 (the post-import epics and stories, added on the board as features shipped). Current board shape (see the sync logs below):
- **WMDP2 Sprint 3** (19 Jul – 2 Aug) — **completed 2026-07-20** with its whole scope Done (WMDP2-17, 65, 67); the Confluence-retrospective offer at close was declined (solo project — this file and the plan *are* the retro)
- **WMDP2 Sprint 4** — **started 2026-07-23** (runs to 16 Aug) with exactly the owner's picked scope: **WMDP2-76** (contract-test the Netlify Functions, created under WMDP2-5) and **WMDP2-20** (custom domain). Sprint goal: protect the live demo's API fidelity with a CI contract check, and resolve the custom-domain half of 20
- **Backlog** — WMDP2-18/19 (flagged: blocked on AWS credentials) and 24 To Do; WMDP2-21, 68, 69, 70, 71, 73, 75 **Done** between sprints (see the sync logs); **WMDP2-74 Done** (Inspection Round — I1 shipped 2026-07-23, I2 shipped and story closed 2026-07-24; the live demo is now the playable round)
- **Unity Simulation Showcase epic (WMDP2-72, In Progress)** — the C#/Unity track, created 2026-07-22; runs parallel to web-app sprints on its own branch and capacity (2–3 h/week), never sprint-mixed by design
- The original Sprint 1/2 objects were deleted during reconciliation — the import's sprint-matching failure had left them as empty, never-started shells while their stories (WMDP2-6..16, all Done) sat outside them
- Keys 25–41 are the subtasks under stories 6–19; keys 42–58 were consumed by the import incident's duplicate subtasks (created, then deleted — see the note below), which is why the Product Polish epic starts at 59

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

## Sprint 3 — AWS Cloud Deployment (completed 2026-07-20)

> What actually finished inside the sprint: WMDP2-17 (hardening), WMDP2-65 (Related sites), WMDP2-67 (review fixes). The AWS provisioning/deploy stories (18/19) had already moved to the backlog on 2026-07-19 so the sprint carried only workable scope.

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

**Epic: Post-Deployment Hardening** (WMDP2-5, **Done** — auto-completed by Jira's parent automation when WMDP2-69, its last open board child, closed on 2026-07-20. Its board children are 22/23/68/69 + 21; WMDP2-20/24 were never epic-linked on the board — an import-era gap found during the 2026-07-21 sync, left for Sprint 4 planning since re-parenting open stories would reopen the epic)
- Story: TLS + custom domain (WMDP2-20) — **re-scoped 2026-07-21** (comment on the story): TLS now comes free with the live netlify.app deployment, so only the custom-domain half remains. To Do, unparented on the board
- ~~Story: Automated CD (WMDP2-21)~~ — **Done, on the board** (2026-07-21, with explanatory comment): overtaken for the production surface — Netlify rebuilds and redeploys on every push to `main`. CD to EC2 would be new scope under the AWS epic. Board parent fixed to WMDP2-5 during the sync
- ~~Story: URL-synced filters and pagination (WMDP2-22)~~ — **Done, on the board.** Shipped in the app: `/sites` (filters + page + sort) and `/map` (filters) both read/write their state to the URL query string. See [WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md) section 1.7.
- ~~Story: Automated test suite (WMDP2-23)~~ — **Done, on the board.** Backend pytest + frontend Vitest/RTL suites, both required CI steps. See WA_MINING_PROJECT_PLAN.md section 1.8 and the platform roadmap for what's still uncovered.
- Story: Path to managed infrastructure if traffic grows (WMDP2-24) — RDS instead of containerized Postgres, horizontal scaling
- ~~Story: Data-refresh guardrails (WMDP2-68)~~ — **Done, on the board** (2026-07-20). Refresh checklist, CSV formula-cell neutralization, seed-time shape warnings. See [WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md) section 1.16.
- ~~Story: Platform hygiene (WMDP2-69)~~ — **Done, on the board** (2026-07-20). Node 24 pinned across dev/CI, literal-BOM CI guard, `/api`-wide `no-store`. See section 1.17.

Also parked here from Sprint 3 (2026-07-19): **WMDP2-18 Provision AWS infrastructure** and **WMDP2-19 Deploy and verify on EC2**, both flagged in Jira as blocked on AWS credentials — the `DEPLOYMENT.md` runbook is ready to execute the moment an account is configured. Moved out of the active sprint so it only carries workable scope.

**Epic: Product Polish** (WMDP2-59, In Progress — created on the board 2026-07-19)
- ~~Story: Sortable table columns~~ — Done, on the board. See WA_MINING_PROJECT_PLAN.md section 1.5.
- ~~Story: Map view~~ — Done, on the board. See section 1.6.
- ~~Story: Command palette / global search (Ctrl/Cmd+K)~~ — Done, on the board. See section 1.9.
- ~~Story: CSV export of filtered view~~ — Done, on the board (covers the export endpoint, header labels, and no-store caching). See sections 1.10 and 1.12.
- ~~Story: Cleaned-data pipeline consolidation~~ — Done, on the board. See section 1.11.
- ~~Story: About page with portfolio referral (WMDP2-71)~~ — **Done, on the board** (2026-07-21). `/about` with the case-study narrative and the outbound referral to the owner's portfolio site. See [WA_MINING_PROJECT_PLAN.md](WA_MINING_PROJECT_PLAN.md) section 1.18.
- ~~Story: Unity demo referral card on the About page (WMDP2-75)~~ — **Done, on the board** (2026-07-22, commit f177b75). The milestone-gated referral decision executed: a "Related experiment" card on `/about` (honest ~30 MB / desktop-recommended labeling, href-pinned by test) rather than a nav-level button — promotion to prominent placement is gated on the Inspection Round scenario landing (WMDP2-74).
- ~~Story: Related sites by project (WMDP2-65)~~ — **Done, on the board** (transitioned in the same sitting the feature shipped). A `?project=` filter on `/api/sites` powers the detail page's related-sites section, the dashboard's project links, and project-scoped exports — see WA_MINING_PROJECT_PLAN.md section 1.14. With WMDP2-17 also Done, **Sprint 3's scope is now fully complete** — and the sprint was closed on 2026-07-20 (see the sync log).

**Epic: Unity Simulation Showcase** (WMDP2-72, In Progress — created on the board 2026-07-22)

The C#/Unity track (Viewport XR-aligned simulation showcase + freelance portfolio piece). Requirements discovery, the validated 5W1H, and the approved feature spec live on branch `feature/unity-shift-supervisor-v2` (`prototypes/unity-shift-supervisor-demo/DISCOVERY.md` and `FEATURE_INSPECTION_ROUND.md`); the epic's description carries the branch discipline (main only receives milestone-quality merges) and the 2–3 h/week capacity.
- ~~Story: Ship the link: WebGL build published at a shareable URL (WMDP2-73)~~ — **Done, on the board** (2026-07-22). Unity 6 headless WebGL build (32 MB, 0 errors, built by the committed `WebGLBuildScript.cs`) live at **https://wa-mining-unity.netlify.app** on its own dedicated Netlify site; verified in production with Playwright (scene render + marker click → correct MINEDEX record); cross-linked from the prototype README (with the build/deploy runbook) and the root README's Related Experiments. The editor-pin reversal (2022.3 → Unity 6) and the four-failure module-install saga are documented in the prototype's DECISIONS.md and TROUBLESHOOTING_LOG.md #3.
- ~~Story: Inspection Round scenario — increments I1+I2 (WMDP2-74)~~ — **Done, on the board** (2026-07-24; spec approved 2026-07-22). I1 (`dc09417`): pure-C# `InspectionRound` core, 23 EditMode tests green headless. I2 (`612e2bd`, `d7a1c93`, `973fce6`): the playable loop — briefing, two-step flag decisions with reasons, progress HUD, end-of-shift report with the caught/missed verdict, restart — generated and wired by the committed idempotent `ScenarioUiBuilder`, with the orbit-camera click-through bug fixed via an EventSystem pointer guard. Verified with a full-loop Playwright click-through of the built WebGL output, then redeployed to **wa-mining-unity.netlify.app** (production spot-check green). The spec's I2 milestone merge (branch → main) is pending the owner's call.

## Board sync log (2026-07-24)

Same sitting as the 2026-07-23 log, past midnight — increment I2 shipped and the story closed:
- **WMDP2-74 → Done** with a closing comment carrying the full I1+I2 recap, the four branch commits, the live URL, and the open merge-gate question. The I2 work behind it: the playable inspection-round loop built by the committed `ScenarioUiBuilder`, the orbit-camera click-through fix, EditMode suite still 23/23, full-loop Playwright verification of the built WebGL output, and the redeploy to wa-mining-unity.netlify.app (production spot-check green).
- Sprint 4's own stories (WMDP2-76, WMDP2-20) deliberately untouched — the Unity track runs beside the sprint. The spec's I2 milestone merge (`feature/unity-shift-supervisor-v2` → main) is an owner decision, recorded here as pending.

## Board sync log (2026-07-23)

Sprint 4 executed and the Unity increment started, same sitting:
- **WMDP2-76 "Contract-test the Netlify Functions against the FastAPI reference"** created — Story, parent WMDP2-5, assigned, full differential-testing scope in the description — and placed into Sprint 4.
- **WMDP2-20** placed into Sprint 4 (its re-scoped custom-domain-only remit stands).
- **Sprint 4 started** (2026-07-23 → 16 Aug, goal recorded in Jira): exactly the two stories the owner picked on 2026-07-21, nothing back-filled.
- **WMDP2-74 → In Progress** as Inspection Round increment I1 shipped on the branch (`dc09417`: pure-C# scenario core + 23 EditMode tests, all green headless). I2 (the playable loop UI) is the story's remaining scope.

## Board sync log (2026-07-22)

The Unity track materialized on the board, all verified by page reads after each mutation:
- **WMDP2-72 "Unity Simulation Showcase"** — epic created via the Create dialog (work type corrected from the dialog's retained "Epic→Story" state... the dialog retains the last-used type; verify it every time), set In Progress, assigned, described.
- **WMDP2-73** — created as the Option 1 story ("Ship the link"), In Progress during the build/publish work, **Done** with a closing comment carrying the live URL, build facts, and doc pointers.
- **WMDP2-74** — created under the epic with the approved spec scope in its description, assigned, left **To Do** deliberately.
- **WMDP2-75** — created under Product Polish for the About-page referral card, **Done** (the work shipped in the same sitting, commit f177b75).
- Repair: **WMDP2-5's assignee restored** (an earlier stray-keystroke mishap had unassigned it).
- Process note, again for the record: Jira's single-key shortcuts (c = create, i = assign-toggle, m = comment) fire whenever a click misses its input target — this sitting they briefly unassigned WMDP2-72 and WMDP2-75 and opened stray Create dialogs, all caught by the click→screenshot-verify→type protocol and repaired within the minute. Treat every type-after-click on this board as unverified until a screenshot proves focus.

## Board sync log (2026-07-21)

The 2026-07-21 pending-sync spec this section previously held, executed once Chrome reconnected. A deliberate decision first: the About page and Netlify deployment were **not** added to the completed Sprint 3, even though 21 Jul falls inside its original 19 Jul–2 Aug window — the sprint closed on 20 Jul with 100% of its scope done, and reopening a completed sprint to back-fill it would corrupt the sprint report the same way pre-filling Sprint 4 would fake velocity. Done-in-backlog remains the truthful record (owner approved this reasoning before execution).

Created and transitioned:
- **WMDP2-70** — "Netlify production deployment + agent-PR postmortem" — Story, parent **WMDP2-4 AWS Cloud Deployment**, no sprint, **Done**, description linking plan 1.19. (Created via the epic page's inline child row, which sidesteps the Create dialog's retained-fields trap — but its type selector defaults to Task and the first Story click didn't register; the type was corrected on the item afterward. Verify the type icon after inline creation.)
- **WMDP2-71** — "About page with portfolio referral" — Story, parent **WMDP2-59 Product Polish**, no sprint, **Done**, description linking plan 1.18.
- **WMDP2-21 Automated CD** — Done with explanatory comment (Netlify auto-builds `main`; EC2 CD would be new AWS-epic scope), and its missing epic link fixed to WMDP2-5.
- **WMDP2-20 TLS and custom domain** — scope-note comment added (TLS free via netlify.app; custom domain is the remaining half), stays To Do for Sprint 4 planning.
- **WMDP2-18/19** — untouched, still flagged: genuinely blocked on AWS credentials.

Drift discovered during the sync (recorded, not silently fixed):
- **The import never epic-linked 17/18/19/20/24** — WMDP2-4 "AWS Cloud Deployment" (In Progress) had zero children until WMDP2-70; the backlog rows' hierarchy icons belong to their subtasks, not epic links. This file's epic groupings described intent, not board reality.
- **WMDP2-5 auto-completed** on 2026-07-20 when WMDP2-69 closed (its only board children were 22/23/68/69, all Done). Re-parenting the open 20/24 under it would reopen it — a real option, but a Sprint 4 planning call, not a unilateral sync action.

## Board sync log (2026-07-20)

The sprint review's three stories, created on the board once Chrome was available (the "pending sync" spec this section previously held is now executed):
- **WMDP2-67** — "Code-review fixes: breakdown tie ordering + search wildcard escaping" — Done, parent WMDP2-59 Product Polish, placed **in Sprint 3** since the work happened inside the sprint's window (plan 1.15, C1+C2).
- **WMDP2-68** — "Data-refresh guardrails" — To Do, parent WMDP2-5 Post-Deployment Hardening, backlog (plan 2.1).
- **WMDP2-69** — "Platform hygiene: Node pin, U+FEFF CI guard, JSON cache headers" — To Do, parent WMDP2-5, backlog (plan 2.2).

Sprint 3 at that point held WMDP2-17, 65, 67 — all Done; the backlog held 18/19 (flagged, AWS-blocked), 20, 21, 24, 68, 69.

Later the same sitting (sprint close + the two hardening stories):
- **Sprint 3 completed** through the backlog's Complete-sprint flow — the dialog confirmed "3 completed work items. That's all of them." The offered Confluence retrospective was declined (ceremony without a team; this log and the plan file carry the retro content). Jira auto-created an empty **Sprint 4** (2 Aug – 16 Aug), left un-started while the deployment direction (free-tier live demo now vs. wait for AWS credentials) is an open decision.
- **WMDP2-68 Data-refresh guardrails**: To Do → In Progress when implementation started → **Done** once both suites passed (plan 1.16).
- **WMDP2-69 Platform hygiene**: same flow, same sitting → **Done** (plan 1.17).
- 68/69 were deliberately **not** dragged into the Sprint 4 shell: the work happened between sprints, and back-filling a future sprint with already-finished items would fake its velocity report. Done-in-backlog is the truthful record.

## Board reconciliation log (2026-07-19)

The board drifted while the repo shipped (every item above previously carried a "done, not yet reflected in the live Jira board" note). Reconciled in one pass, executed through the Jira UI:
- WMDP2-22 and WMDP2-23 transitioned to Done; Jira's built-in parent automation moved epic WMDP2-5 to In Progress on its own.
- Product Polish epic (WMDP2-59) created with five Done stories for the shipped-untracked features, plus WMDP2-65 (Related sites) into Sprint 3.
- The empty, never-started Sprint 1/2 shells were deleted (their stories WMDP2-6..16 keep their Done status; retro-dating fake sprint completions would have corrupted the record worse than absence does).
- WMDP2-18/19 moved from Sprint 3 to the backlog and flagged, so the active sprint no longer consists entirely of externally-blocked work.

## How this got into Jira

Via **System → External System Import → CSV** (`jira_backlog_import.csv`, same directory), using a `Work item Id` column to make Sub-task → Parent linking resolve reliably (Jira's CSV importer matches `Epic Link` against `Epic Name` by value directly, but `Parent` needs real ID references within the same file, not text matching). Sprint assignment was done as a separate bulk-edit pass afterward, since the importer doesn't create new sprints from a CSV's `Sprint` column values.

If re-running this CSV against a fresh project: watch for the "Import Work items" step reporting near-complete (e.g. 59%) faster than it's actually finished — the Sub-task rows can process on a slower deferred path and land 15-20 minutes later, which reads as stalled but isn't. Wait for it to fully finish before manually recreating anything, or you'll get duplicates.
