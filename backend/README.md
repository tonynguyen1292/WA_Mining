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
├── requirements.txt
├── requirements-dev.txt        # + ruff, for CI/local linting
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

```
python -m app.db.seed
# or, if the stack is running under Docker Compose:
docker compose exec backend python -m app.db.seed
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/sites` | Paginated list. Query params: `commodity`, `region`, `stage`, `site_type`, `search`, `page`, `page_size` |
| GET | `/api/sites/{site_code}` | Single site detail; 404 if not found |
| GET | `/api/kpis` | Portfolio totals + breakdowns by stage/site type/commodity/region. Same filter params as `/api/sites` (minus `search`) |
| GET | `/api/meta/filters` | Distinct values for each filterable field, for populating dropdowns |

## Linting

```
pip install -r requirements-dev.txt
ruff check app
```

Runs in CI on every push/PR (`.github/workflows/ci.yml`), alongside a `python -m compileall` check.

## Known scope limits

No auth, no write endpoints beyond the seed script, no automated tests yet (see the root README's Future Improvements).
