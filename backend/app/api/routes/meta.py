from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.site import FilterOptions
from app.services import portfolio_service

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/filters", response_model=FilterOptions)
def get_filter_options(db: Session = Depends(get_db)) -> FilterOptions:
    return portfolio_service.get_filter_options(db)
