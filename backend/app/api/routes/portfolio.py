from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.site import KpiSummary
from app.services import portfolio_service

router = APIRouter(prefix="/api/kpis", tags=["kpis"])


@router.get("", response_model=KpiSummary)
def get_kpis(
    commodity: list[str] | None = Query(None, description="Filter by target_group_name (repeatable)"),
    region: list[str] | None = Query(None, description="Filter by development_region (repeatable)"),
    stage: list[str] | None = Query(None, description="Filter by stage (repeatable)"),
    site_type: list[str] | None = Query(None, description="Filter by site_type (repeatable)"),
    db: Session = Depends(get_db),
) -> KpiSummary:
    return portfolio_service.get_kpis(
        db, commodity=commodity, region=region, stage=stage, site_type=site_type
    )
