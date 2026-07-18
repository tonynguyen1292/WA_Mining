# Frontend — WA Mining Portfolio App

A React + TypeScript app over the [backend API](../backend/README.md): a portfolio dashboard, a filterable sites explorer, and a site detail page. See the [root README](../README.md) for full project context.

## Structure

```
frontend/
├── src/
│   ├── main.tsx              # React root, router setup
│   ├── App.tsx                # layout shell + route definitions
│   ├── api/
│   │   └── client.ts          # typed fetch wrapper over the backend API
│   ├── types/
│   │   └── site.ts            # shared TS types, mirroring the backend's Pydantic schemas
│   ├── pages/
│   │   ├── DashboardPage.tsx  # KPI cards + breakdown charts, filter-aware
│   │   ├── SitesPage.tsx      # filterable, sortable, paginated sites table; URL-synced
│   │   ├── SiteDetailPage.tsx # single site's full record
│   │   └── MapPage.tsx        # all matching sites plotted on a map, colored by stage; URL-synced filters
│   ├── components/
│   │   ├── FilterBar.tsx      # search + 4 MultiSelect controls (search hidden on Dashboard)
│   │   ├── MultiSelect.tsx    # checkbox-panel multi-select dropdown, shared by all 4 filter fields
│   │   ├── KpiCard.tsx
│   │   ├── SitesTable.tsx     # sortable column headers (click to toggle asc/desc)
│   │   ├── SitesTable.test.tsx  # sort-cycle behavior (vitest + RTL)
│   │   ├── SitesMap.tsx       # Leaflet map, CircleMarker per site, popup with site details
│   │   ├── CommandPalette.tsx # Ctrl/Cmd+K global search modal
│   │   └── charts/
│   │       └── BreakdownChart.tsx  # generic horizontal bar chart, reused for stage/commodity/region
│   ├── hooks/
│   │   └── useDebouncedValue.ts   # debounces filter changes before refetching
│   ├── utils/
│   │   ├── urlFilters.ts      # parse/serialize filters+page+sort <-> URL query params, shared by SitesPage and MapPage
│   │   └── urlFilters.test.ts # parse/serialize/round-trip coverage (vitest)
│   └── test/
│       └── setup.ts           # vitest + jest-dom setup, referenced from vite.config.ts
├── package.json
├── vite.config.ts             # also configures vitest (test.environment, setupFiles)
├── Dockerfile                 # multi-stage: build (node) -> serve (nginx), for production
├── nginx.conf                 # SPA fallback + reverse-proxies /api, /health, /docs to the backend
└── .env.example
```

## Running

```
npm install
cp .env.example .env   # VITE_API_BASE_URL defaults to http://localhost:8000
npm run dev
```

App: http://localhost:5173. Requires the backend API to be running (see the [root README](../README.md#getting-started)) — the dashboard, sites list, and detail pages all fetch live data, there's no mock/offline mode.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server (hot reload) |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest suite (watch mode); `npm run test -- --run` for a single pass, e.g. in CI |

## Testing

Vitest (Vite-native, so it reuses `vite.config.ts` rather than a separate config format) + React Testing Library + jsdom. `src/test/setup.ts` wires up `@testing-library/jest-dom`'s matchers.

- `utils/urlFilters.test.ts` — parsing, serializing, and round-tripping filters/page/sort through `URLSearchParams`, including edge cases like a non-numeric or negative `page` value
- `components/SitesTable.test.tsx` — the header click-cycle (ascending → descending → ascending on the same column; a different column always starts ascending), rendered with React Testing Library and a `MemoryRouter` (`SitesTable` renders `<Link>` internally)

Runs in CI (`npm run test -- --run`) before the typecheck/build step. Not exhaustive — `MultiSelect`, `CommandPalette`, and the URL-sync effects in `SitesPage`/`MapPage` have no direct tests yet.

## Notes

- `CommandPalette` (`Ctrl`/`Cmd`+`K`, or the "Search sites" button in the header, both wired up in `App.tsx`) is a global search modal mounted once at the app root, not per-page — a command palette that only works on some routes isn't one you can rely on. It reuses `fetchSites({ search })` (no new backend endpoint), debounces at 150ms (snappier than the filter bar's 300ms, since instant feedback is the whole point), and supports ↑/↓/Enter/Escape plus a backdrop click to close. Focus-on-open uses the `autoFocus` prop rather than a ref + `requestAnimationFrame` — the latter was tried first and proved unreliable, since the `<input>` is genuinely unmounted/remounted each time the palette opens (an early `if (!isOpen) return null`), which is exactly the condition `autoFocus` handles correctly on its own. Fetch errors are logged to the console with a `[CommandPalette]` tag and shown inline, rather than failing silently.
- `/sites` (filters + page + sort) and `/map` (filters) sync their state to the URL query string (`utils/urlFilters.ts`), using `history.replace` rather than `push` so rapid filter/sort/page changes don't flood browser history. Filtered/paginated/sorted links are shareable and survive a reload. Reads from and writes the same param names the backend accepts (`commodity`, `region`, `stage`, `site_type`, `search`, `sort`, `page`), so the URL bar and network tab always match.
- `SitesTable`'s column headers are clickable to sort (toggles ascending/descending, ▲/▼ indicator on the active column). Sort and pagination changes bypass the 300ms filter debounce below — a header or pagination click is a discrete action, not a keystroke burst, so there's no typing to coalesce and the user expects an immediate reorder/page change.
- `SitesMap` (Leaflet via `react-leaflet`) plots every site matching the current filters, colored by `stage`, with a popup linking to the site's detail page. `CircleMarker` is used instead of the default `Marker` to avoid Vite's broken default-icon-path issue. `.map-container` sets `isolation: isolate` — without it, Leaflet's own panes/controls (z-index up to 1000) escape their container and render above sibling page content like the filter dropdowns (z-index: 10).
- Commodity/region/stage/site type are all multi-select (`MultiSelect`, a checkbox dropdown panel) — `SiteFilters` holds each as `string[]`, and `api/client.ts` serializes them as repeated query params (`?region=Pilbara&region=Kimberley`) matching the backend's `list[str] | None = Query(...)` parsing. Native `<select multiple>` was deliberately not used — no visual selected-state without ctrl/cmd-click, and it eats vertical space.
- Charts use [Recharts](https://recharts.org/); `BreakdownChart` is intentionally generic (title + data + color) rather than one component per chart, since the three charts are structurally identical.
- Filter changes are debounced 300ms (`useDebouncedValue`) before refetching, so typing in the search box doesn't fire a request per keystroke.
- `/api/kpis` doesn't accept a `search` filter, so `FilterBar`'s search input is hidden on the Dashboard (`showSearch={false}`) — it's only shown on the Sites and Map pages, where it actually does something.
- No component library — plain CSS in `src/index.css`, kept deliberately minimal, with a responsive pass for narrow viewports (`@media (max-width: 720px)` in `index.css`).
- Production build is served via nginx (`Dockerfile` + `nginx.conf`) — see the [root README](../README.md#production--deployment).
- `api/client.ts`'s `API_BASE_URL` resolves in this order: an explicit `VITE_API_BASE_URL` (dev's `.env`, or a prod build arg) always wins; otherwise the dev server falls back to `http://localhost:8000`, while a production build falls back to `window.location.origin` — i.e. same-origin, since nginx now proxies `/api` itself. This distinction uses Vite's `import.meta.env.DEV`/`PROD`, not a truthiness check, because a prod build arg explicitly set to `""` (the `docker-compose.prod.yml` default) is otherwise indistinguishable from "unset" once Vite bakes it into the bundle.
- `api/client.ts` throws a typed `ApiError` (carries the HTTP status and the backend's `detail` message) rather than a plain `Error`, so pages can distinguish "the request was invalid" (e.g. a 422 from a hand-edited `?sort=` value) from "the API is unreachable" and show the right message for each.
