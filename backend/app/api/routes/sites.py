from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.site import SiteListResponse, SiteOut
from app.services import portfolio_service

router = APIRouter(prefix="/api/sites", tags=["sites"])


@router.get("", response_model=SiteListResponse)
def list_sites(
    commodity: list[str] | None = Query(
        None, description="Filter by target_group_name (repeat param for multiple, e.g. ?commodity=Gold&commodity=Nickel)"
    ),
    region: list[str] | None = Query(None, description="Filter by development_region (repeatable)"),
    stage: list[str] | None = Query(None, description="Filter by stage (repeatable)"),
    site_type: list[str] | None = Query(None, description="Filter by site_type (repeatable)"),
    search: str | None = Query(None, description="Free-text match on title / project / site code"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> SiteListResponse:
    items, total = portfolio_service.list_sites(
        db,
        commodity=commodity,
        region=region,
        stage=stage,
        site_type=site_type,
        search=search,
        page=page,
        page_size=page_size,
    )
    return SiteListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{site_code}", response_model=SiteOut)
def get_site(site_code: str, db: Session = Depends(get_db)) -> SiteOut:
    site = portfolio_service.get_site(db, site_code)
    if site is None:
        raise HTTPException(status_code=404, detail=f"Site '{site_code}' not found")
    return site
