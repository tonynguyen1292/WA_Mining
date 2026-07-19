from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.site import SiteListResponse, SiteOut
from app.services import portfolio_service
from app.services.portfolio_service import SORTABLE_COLUMNS, InvalidSortField

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
    project: list[str] | None = Query(
        None, description="Filter by project_code (repeatable) -- e.g. ?project=J00098 for all of a project's sites"
    ),
    sort: str | None = Query(
        None,
        description=(
            "Column to sort by, prefixed with '-' for descending "
            f"(e.g. ?sort=-stage). Valid fields: {', '.join(sorted(SORTABLE_COLUMNS))}"
        ),
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    db: Session = Depends(get_db),
) -> SiteListResponse:
    try:
        items, total = portfolio_service.list_sites(
            db,
            commodity=commodity,
            region=region,
            stage=stage,
            site_type=site_type,
            search=search,
            project=project,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    except InvalidSortField as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return SiteListResponse(items=items, total=total, page=page, page_size=page_size)


# Registered BEFORE /{site_code}: FastAPI matches routes in registration
# order, so if this came after, GET /api/sites/export would be captured by
# the path parameter and 404 as "Site 'export' not found".
@router.get("/export")
def export_sites(
    commodity: list[str] | None = Query(None, description="Same filter as the list endpoint (repeatable)"),
    region: list[str] | None = Query(None, description="Same filter as the list endpoint (repeatable)"),
    stage: list[str] | None = Query(None, description="Same filter as the list endpoint (repeatable)"),
    site_type: list[str] | None = Query(None, description="Same filter as the list endpoint (repeatable)"),
    search: str | None = Query(None, description="Same free-text match as the list endpoint"),
    project: list[str] | None = Query(None, description="Same project_code filter as the list endpoint (repeatable)"),
    sort: str | None = Query(
        None,
        description=(
            "Same sort as the list endpoint, prefixed with '-' for descending. "
            f"Valid fields: {', '.join(sorted(SORTABLE_COLUMNS))}"
        ),
    ),
    db: Session = Depends(get_db),
) -> Response:
    """The current filtered+sorted view as a CSV download -- the full result
    set, not one page of it."""
    try:
        items = portfolio_service.list_sites_for_export(
            db,
            commodity=commodity,
            region=region,
            stage=stage,
            site_type=site_type,
            search=search,
            project=project,
            sort=sort,
        )
    except InvalidSortField as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    csv_text = portfolio_service.sites_to_csv(items)
    # UTF-8 BOM: Excel on Windows assumes a legacy codepage for BOM-less
    # CSV; harmless everywhere else and makes the file open correctly there.
    return Response(
        content="\ufeff" + csv_text,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="wa_mining_sites.csv"',
            # This response had no cache directives at all before -- without
            # explicit no-store, a browser (or an intermediary) is free to
            # reuse a previously cached response for an identical request URL
            # (e.g. a bare /api/sites/export with no filters) even after the
            # underlying data has changed server-side, such as after a
            # re-seed. That's exactly the kind of "it's fixed on the server
            # but the client still shows the old thing" gap worth closing
            # explicitly rather than relying on the absence of caching
            # headers to *imply* no caching.
            "Cache-Control": "no-store",
        },
    )


@router.get("/{site_code}", response_model=SiteOut)
def get_site(site_code: str, db: Session = Depends(get_db)) -> SiteOut:
    site = portfolio_service.get_site(db, site_code)
    if site is None:
        raise HTTPException(status_code=404, detail=f"Site '{site_code}' not found")
    return site
