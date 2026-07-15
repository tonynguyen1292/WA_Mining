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
│   └── components/
│       ├── FilterBar.tsx      # commodity/region/stage/site_type/search controls
│       ├── KpiCard.tsx
│       ├── SitesTable.tsx
│       └── charts/
│           └── BreakdownChart.tsx  # generic horizontal bar chart, reused for stage/commodity/region
├── package.json
├── vite.config.ts
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
- No component library — plain CSS in `src/index.css`, kept deliberately minimal.
