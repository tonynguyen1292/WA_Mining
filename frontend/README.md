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
│   │   ├── SitesPage.tsx      # filterable, paginated sites table
│   │   └── SiteDetailPage.tsx # single site's full record
│   ├── components/
│   │   ├── FilterBar.tsx      # commodity/region/stage/site_type/search controls (search hidden on Dashboard)
│   │   ├── KpiCard.tsx
│   │   ├── SitesTable.tsx
│   │   └── charts/
│   │       └── BreakdownChart.tsx  # generic horizontal bar chart, reused for stage/commodity/region
│   └── hooks/
│       └── useDebouncedValue.ts   # debounces filter changes before refetching
├── package.json
├── vite.config.ts
├── Dockerfile                 # multi-stage: build (node) -> serve (nginx), for production
├── nginx.conf                 # SPA fallback so client-side routes survive a hard refresh
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

## Notes

- Filter state and pagination are held in component state, not yet synced to the URL — sharing a filtered/paginated link isn't possible yet (see root README's Future Improvements).
- Charts use [Recharts](https://recharts.org/); `BreakdownChart` is intentionally generic (title + data + color) rather than one component per chart, since the three charts are structurally identical.
- Filter changes are debounced 300ms (`useDebouncedValue`) before refetching, so typing in the search box doesn't fire a request per keystroke.
- `/api/kpis` doesn't accept a `search` filter, so `FilterBar`'s search input is hidden on the Dashboard (`showSearch={false}`) — it's only shown on the Sites page, where it actually does something.
- No component library — plain CSS in `src/index.css`, kept deliberately minimal, with a responsive pass for narrow viewports (`@media (max-width: 720px)` in `index.css`).
- Production build is served via nginx (`Dockerfile` + `nginx.conf`) — see the [root README](../README.md#production--deployment).
