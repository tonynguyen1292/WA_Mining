from pydantic import BaseModel, ConfigDict


class SiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    site_code: str
    project_code: str | None = None
    project_title: str | None = None
    title: str | None = None
    short_title: str | None = None
    site_type: str | None = None
    subtype: str | None = None
    stage: str | None = None
    target_group_name: str | None = None
    commodity_group_name: str | None = None
    development_region: str | None = None
    lga_name: str | None = None
    longitude: float | None = None
    latitude: float | None = None
    active_flag: str | None = None


class SiteListResponse(BaseModel):
    items: list[SiteOut]
    total: int
    page: int
    page_size: int


class BreakdownItem(BaseModel):
    label: str
    count: int


class KpiSummary(BaseModel):
    total_sites: int
    total_projects: int
    by_stage: list[BreakdownItem]
    by_site_type: list[BreakdownItem]
    by_commodity: list[BreakdownItem]
    by_region: list[BreakdownItem]


class FilterOptions(BaseModel):
    commodities: list[str]
    regions: list[str]
    stages: list[str]
    site_types: list[str]
