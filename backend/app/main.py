from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, meta, portfolio, sites
from app.core.config import settings

app = FastAPI(
    title="WA Mining Portfolio API",
    description="Read-only API over WA's MINEDEX Major Resource Projects dataset.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_responses_are_not_cacheable(request: Request, call_next):
    """Stamp `Cache-Control: no-store` on /api responses that don't set their own.

    Same staleness argument that put no-store on the CSV export: after a
    re-seed, a cached JSON payload for an identical request URL would show
    old data with no error anywhere -- and this dataset is small enough
    that re-fetching it is always cheaper than debugging staleness. Routes
    that set their own Cache-Control (the export does) keep it; /health and
    /docs are deliberately outside the /api prefix and stay unstamped.
    """
    response = await call_next(request)
    if request.url.path.startswith("/api") and "cache-control" not in response.headers:
        response.headers["cache-control"] = "no-store"
    return response

app.include_router(health.router)
app.include_router(sites.router)
app.include_router(portfolio.router)
app.include_router(meta.router)
