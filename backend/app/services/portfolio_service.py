"""Query logic for the sites listing and portfolio KPIs.

Reuses the aggregation patterns from SQL/04_create_summary_view.sql and
SQL/05_portfolio_summary.sql (COUNT/CASE-style breakdowns by stage,
commodity, region, and site type), but as parameterised queries instead of
fixed views, since the API needs to apply the same filters a user picks in
the UI. Computing `by_stage` with a plain GROUP BY (rather than 05's
hardcoded per-stage CASE list) also fixes the "Undeveloped/Shut not
bucketed" gap noted in the repo's own README as a byproduct.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.site import Site

# Allowlist: the only columns /api/sites will sort by, and the exact
# strings the `sort` query param accepts (prefix with "-" for descending).
# Deliberately not a passthrough of arbitrary column names to ORDER BY.
SORTABLE_COLUMNS: dict[str, object] = {
    "title": Site.title,
    "project_title": Site.project_title,
    "site_type": Site.site_type,
    "stage": Site.stage,
    "target_group_name": Site.target_group_name,
    "development_region": Site.development_region,
}


class InvalidSortField(ValueError):
    """Raised when a `sort` value isn't in SORTABLE_COLUMNS."""


def resolve_sort(sort: str | None):
    """Parse a `sort` param like "-stage" into (column, descending).

    Raises InvalidSortField if the field isn't one of SORTABLE_COLUMNS --
    the API layer turns that into a 422, rather than this silently
    falling back to the default order or passing an arbitrary string to
    the database.
    """
    if not sort:
        return None

    descending = sort.startswith("-")
    field = sort[1:] if descending else sort
    column = SORTABLE_COLUMNS.get(field)
    if column is None:
        raise InvalidSortField(
            f"Cannot sort by '{field}'. Valid fields: {', '.join(sorted(SORTABLE_COLUMNS))} "
            "(prefix with '-' for descending)."
        )
    return column, descending


def _apply_filters(
    stmt,
    *,
    commodity: list[str] | None,
    region: list[str] | None,
    stage: list[str] | None,
    site_type: list[str] | None,
    search: str | None,
):
    if commodity:
        stmt = stmt.where(Site.target_group_name.in_(commodity))
    if region:
        stmt = stmt.where(Site.development_region.in_(region))
    if stage:
        stmt = stmt.where(Site.stage.in_(stage))
    if site_type:
        stmt = stmt.where(Site.site_type.in_(site_type))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            Site.title.ilike(like)
            | Site.project_title.ilike(like)
            | Site.site_code.ilike(like)
        )
    return stmt


def list_sites(
    db: Session,
    *,
    commodity: list[str] | None = None,
    region: list[str] | None = None,
    stage: list[str] | None = None,
    site_type: list[str] | None = None,
    search: str | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[Site], int]:
    base_stmt = _apply_filters(
        select(Site),
        commodity=commodity,
        region=region,
        stage=stage,
        site_type=site_type,
        search=search,
    )

    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0

    resolved = resolve_sort(sort)
    if resolved is not None:
        column, descending = resolved
        primary_order = column.desc().nulls_last() if descending else column.asc().nulls_last()
    else:
        primary_order = Site.title.asc().nulls_last()

    # site_code is appended as a stable tiebreaker on every query, sorted
    # or not -- several columns (stage, region, site_type) are low enough
    # cardinality that without a deterministic secondary key, Postgres
    # doesn't guarantee consistent ordering for tied rows across requests,
    # which surfaces as pagination bugs (a row on two pages, or missing)
    # rather than an obvious error.
    items_stmt = (
        base_stmt.order_by(primary_order, Site.site_code.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(items_stmt).all())
    return items, total


def get_site(db: Session, site_code: str) -> Site | None:
    return db.get(Site, site_code)


def get_kpis(
    db: Session,
    *,
    commodity: list[str] | None = None,
    region: list[str] | None = None,
    stage: list[str] | None = None,
    site_type: list[str] | None = None,
) -> dict:
    base_stmt = _apply_filters(
        select(Site),
        commodity=commodity,
        region=region,
        stage=stage,
        site_type=site_type,
        search=None,
    )
    filtered = base_stmt.subquery()

    total_sites = db.scalar(select(func.count()).select_from(filtered)) or 0
    total_projects = db.scalar(
        select(func.count(func.distinct(filtered.c.project_code)))
    ) or 0

    def breakdown(column_name: str) -> list[dict]:
        col = filtered.c[column_name]
        stmt = (
            select(col, func.count().label("count"))
            .group_by(col)
            .order_by(func.count().desc())
        )
        return [
            {"label": label or "Unspecified", "count": count}
            for label, count in db.execute(stmt).all()
        ]

    return {
        "total_sites": total_sites,
        "total_projects": total_projects,
        "by_stage": breakdown("stage"),
        "by_site_type": breakdown("site_type"),
        "by_commodity": breakdown("target_group_name"),
        "by_region": breakdown("development_region"),
    }


def get_filter_options(db: Session) -> dict:
    def distinct(column) -> list[str]:
        stmt = select(column).where(column.isnot(None)).distinct().order_by(column.asc())
        return [row[0] for row in db.execute(stmt).all()]

    return {
        "commodities": distinct(Site.target_group_name),
        "regions": distinct(Site.development_region),
        "stages": distinct(Site.stage),
        "site_types": distinct(Site.site_type),
    }
