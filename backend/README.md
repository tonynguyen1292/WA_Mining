# Backend — WA Mining Portfolio API

A read-only FastAPI service over the cleaned MINEDEX `sites` dataset. See the [root README](../README.md) for the full project context and how this fits with the frontend and the original SQL pipeline.

## Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── core/
│   │   ├── config.py           # env-based settings (DATABASE_URL, CORS_ORIGINS)
│   │   └── database.py         # SQLAlchemy engine/session, Base, get_db()
│   ├── models/
│   │   └── site.py             # `Site` ORM model (mirrors the `sites` table)
│   ├── schemas/
│   │   └── site.py             # Pydantic request/response types
│   ├── api/routes/
│   │   ├── health.py           # GET /health
│   │   ├── sites.py            # GET /api/sites, GET /api/sites/{site_code}
│   │   ├── portfolio.py        # GET /api/kpis
│   │   └── meta.py             # GET /api/meta/filters
│   ├── services/
│   │   └── portfolio_service.py  # filtering + aggregation query logic
│   └── db/
│       └── seed.py             # loads + cleans the CSV into `sites`
├── tests/
│   ├── conftest.py             # in-memory SQLite fixtures + TestClient
│   ├── test_portfolio_service.py  # sort/filter/tiebreaker/NULL-handling logic
│   └── test_sites_routes.py    # /api/sites HTTP-layer behavior (422s, filters, 404s)
├── requirements.txt
├── requirements-dev.txt        # + ruff, pytest, httpx, for CI/local linting + testing
├── Dockerfile
├── .dockerignore
└── .env.example
```

`Dockerfile` runs `uvicorn --reload` by default (used as-is by the root `docker-compose.yml` for local dev). The root `docker-compose.prod.yml` overrides the command to drop `--reload` — see the [root README](../README.md#production--deployment).

## Running

Via Docker Compose from the repo root (recommended) — see the [root README](../README.md#getting-started). To run natively instead:

```
createdb wa_mining
python -m venv .venv && .venv\Scripts\activate   # or source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # adjust DATABASE_URL if needed
python -m app.db.seed
uvicorn app.main:app --reload
```

Interactive API docs: http://localhost:8000/docs

## Data model

`Site` (table `sites`, primary key `site_code`) is the grain the whole API is built around — a project (`project_code`) is a grouping of one or more sites (mine, processing plant, port, etc.), matching the grain decision documented in `data_dictionary.md`.

`title` / `short_title` are carried through from the raw CSV even though the original `SQL/02_create_clean_table.sql` dropped them — a UI needs a human-readable site name, not just codes.

## Seeding

`app/db/seed.py` reads `DATABASES/raw/Major_Resource_Projects.csv` directly and applies the same cleaning rules as `SQL/01_create_raw_table.sql` through `SQL/03_insert_cleaned_data.sql` (trimming, title-casing, region/LGA suffix handling), ported into Python. It intentionally skips the two-phase `staging_sites` → `sites` load the SQL pipeline uses — the CSV is read and cleaned in one pass. Re-running it is safe; it clears and reloads `sites` each time.

Before inserting, it validates the parsed rows and refuses to seed if something looks wrong, rather than silently loading bad data: fewer than 100 parsed rows (likely a truncated/malformed CSV), or any duplicate `SITE_CODE` (the primary key). After inserting, it re-counts `sites` and errors if the count doesn't match what was loaded.

```
python -m app.db.seed
# or, if the stack is running under Docker Compose:
docker compose exec backend python -m app.db.seed
```

## Endpoints

Filters (`commodity`, `region`, `stage`, `site_type`) accept multiple values by repeating the query parameter — e.g. `?commodity=Gold&commodity=Nickel&region=Pilbara` matches sites that are (Gold OR Nickel) commodity AND in the Pilbara region. A single value still works the same way it always did (`?stage=Operating`).

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/sites` | Paginated list. Query params: `commodity`, `region`, `stage`, `site_type` (each repeatable), `search`, `sort` (allowlisted column, prefix `-` for descending, e.g. `-stage`; invalid values return 422), `page`, `page_size` |
| GET | `/api/sites/{site_code}` | Single site detail; 404 if not found |
| GET | `/api/kpis` | Portfolio totals + breakdowns by stage/site type/commodity/region. Same filter params as `/api/sites` (minus `search`) |
| GET | `/api/meta/filters` | Distinct values for each filterable field, for populating dropdowns |

## Linting

```
pip install -r requirements-dev.txt
ruff check app tests
```

Runs in CI on every push/PR (`.github/workflows/ci.yml`), alongside a `python -m compileall` check.

## Testing

```
pip install -r requirements-dev.txt
pytest
```

Tests run against an in-memory SQLite database, not a real Postgres — `conftest.py` seeds a small, hand-picked set of `Site` rows (including a NULL `stage` and a duplicate-`stage` pair) via the ORM directly, and pins the engine to a single connection with `poolclass=StaticPool` (without it, each connection checkout opens a *new*, empty in-memory database, since SQLite's `:memory:` databases are per-connection, not per-engine — a real failure mode hit while building this, not a hypothetical one). SQLite is a deliberate choice: the logic under test (filtering, sorting, tiebreaking, `NULLS LAST` ordering) is plain SQL that behaves identically on both databases, so a real Postgres container would only add setup time, not coverage.

- `test_portfolio_service.py` — `resolve_sort`'s allowlist/parsing, and `list_sites`'s sort direction, `NULLS LAST` on both directions, the `site_code` tiebreaker's determinism across repeated calls, and filter composition (single value, multiple values as OR, multiple fields as AND, free-text search)
- `test_sites_routes.py` — the HTTP layer on top: does an invalid `sort` actually come back as 422 (not 500), do query params reach the service layer correctly, does an unknown `site_code` 404

Runs in CI alongside linting. Not exhaustive — `/api/kpis` and `/api/meta/filters` have no tests yet.

## Known scope limits

No auth, no write endpoints beyond the seed script.
