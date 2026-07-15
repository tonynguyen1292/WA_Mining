from fastapi import FastAPI
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

app.include_router(health.router)
app.include_router(sites.router)
app.include_router(portfolio.router)
app.include_router(meta.router)
