"""Query logic for the sites listing and portfolio KPIs.

Reuses the aggregation patterns from SQL/04_create_summary_view.sql and
SQL/05_portfolio_summary.sql (COUNT/CASE-style breakdowns by stage,
commodity, region, and site type), but as parameterised queries instead of
fixed views, since the API needs to apply the same filters a user picks in
the UI. Computing `by_stage` with a plain GROUP BY (rather than 05's
hardcoded per-stage CASE list) also fixes the "Undeveloped/Shut not
bucketed" gap noted in the repo's own README as a byproduct.
"""

import csv
import io

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
    project: list[str] | None = None,
):
    if commodity:
        stmt = stmt.where(Site.target_group_name.in_(commodity))
    if region:
        stmt = stmt.where(Site.development_region.in_(region))
    if stage:
        stmt = stmt.where(Site.stage.in_(stage))
    if site_type:
        stmt = stmt.where(Site.site_type.in_(site_type))
    if project:
        # Filters by project_code (the stable identifier), not project_title
        # -- titles are display text; codes are what sites actually share.
        # This one filter serves both "related sites" on the detail page and
        # the dashboard's top-projects links, and inherits sort, URL sync,
        # and CSV export from the shared pipeline instead of needing a
        # dedicated /related endpoint.
        stmt = stmt.where(Site.project_code.in_(project))
    if search:
        # Escape LIKE metacharacters so user input matches literally --
        # without this, searching "100%" over-matches (% is a wildcard) and
        # "_" matches every record (any single character), silently
        # returning wrong results with no error. Backslash first, since
        # it's the escape character itself.
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{escaped}%"
        stmt = stmt.where(
            Site.title.ilike(like, escape="\\")
            | Site.project_title.ilike(like, escape="\\")
            | Site.site_code.ilike(like, escape="\\")
        )
    return stmt


def _apply_order(stmt, sort: str | None):
    """Shared ORDER BY for the sites list and the CSV export.

    Single code path on purpose: the export must be ordered identically to
    the table the user is looking at, and two hand-maintained copies of
    this logic would drift.

    site_code is appended as a stable tiebreaker on every query, sorted
    or not -- several columns (stage, region, site_type) are low enough
    cardinality that without a deterministic secondary key, Postgres
    doesn't guarantee consistent ordering for tied rows across requests,
    which surfaces as pagination bugs (a row on two pages, or missing)
    rather than an obvious error.
    """
    resolved = resolve_sort(sort)
    if resolved is not None:
        column, descending = resolved
        primary_order = column.desc().nulls_last() if descending else column.asc().nulls_last()
    else:
        primary_order = Site.title.asc().nulls_last()
    return stmt.order_by(primary_order, Site.site_code.asc())


def list_sites(
    db: Session,
    *,
    commodity: list[str] | None = None,
    region: list[str] | None = None,
    stage: list[str] | None = None,
    site_type: list[str] | None = None,
    search: str | None = None,
    project: list[str] | None = None,
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
        project=project,
    )

    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0

    items_stmt = (
        _apply_order(base_stmt, sort)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(items_stmt).all())
    return items, total


def list_sites_for_export(
    db: Session,
    *,
    commodity: list[str] | None = None,
    region: list[str] | None = None,
    stage: list[str] | None = None,
    site_type: list[str] | None = None,
    search: str | None = None,
    project: list[str] | None = None,
    sort: str | None = None,
) -> list[Site]:
    """The full filtered+sorted result set, unpaginated, for CSV export.

    No row cap: the whole dataset is 421 rows (~60KB of CSV), so a cap or
    streaming response would be solving a problem this data can't have.
    Revisit if the dataset ever grows by orders of magnitude.
    """
    stmt = _apply_filters(
        select(Site),
        commodity=commodity,
        region=region,
        stage=stage,
        site_type=site_type,
        search=search,
        project=project,
    )
    return list(db.scalars(_apply_order(stmt, sort)).all())


# Column order for the CSV export: site identity first, then
# classification, then location -- matches the Site model's own field
# order so the export is predictable against the data dictionary.
EXPORT_COLUMNS: list[str] = [
    "site_code",
    "project_code",
    "project_title",
    "title",
    "short_title",
    "site_type",
    "subtype",
    "stage",
    "target_group_name",
    "commodity_group_name",
    "development_region",
    "lga_name",
    "longitude",
    "latitude",
    "active_flag",
]

# Header labels for the export, keyed by EXPORT_COLUMNS entry. These follow
# the app's own UI vocabulary (the site detail page and table headers), not
# the database schema -- a real user reading "lga_name" in row 1 of a
# spreadsheet reasonably concludes they've been handed raw data, which is
# exactly the misreading that motivated this mapping. Model attribute names
# stay snake_case; only the presentation layer (this header row) changes.
EXPORT_COLUMN_LABELS: dict[str, str] = {
    "site_code": "Site Code",
    "project_code": "Project Code",
    "project_title": "Project",
    "title": "Site Title",
    "short_title": "Short Title",
    "site_type": "Site Type",
    "subtype": "Subtype",
    "stage": "Stage",
    "target_group_name": "Commodity",
    "commodity_group_name": "Commodity Group",
    "development_region": "Development Region",
    "lga_name": "Local Government Area",
    "longitude": "Longitude",
    "latitude": "Latitude",
    "active_flag": "Active",
}


def sites_to_csv(items: list[Site]) -> str:
    """Serialize sites to CSV text (labeled header row + one row per site).

    Uses the stdlib csv writer rather than string joins -- project titles
    in this dataset really do contain commas ("Boorara / Horizon" style)
    and the writer handles quoting/escaping/embedded newlines correctly
    instead of producing a file that only *looks* like CSV.
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([EXPORT_COLUMN_LABELS[column] for column in EXPORT_COLUMNS])
    for site in items:
        writer.writerow([getattr(site, column) for column in EXPORT_COLUMNS])
    return buffer.getvalue()


def get_site(db: Session, site_code: str) -> Site | None:
    return db.get(Site, site_code)


def get_kpis(
    db: Session,
    *,
    commodity: list[str] | None = None,
    region: list[str] | None = None,
    stage: list[str] | None = None,
    site_type: list[str] | None = None,
    project: list[str] | None = None,
) -> dict:
    base_stmt = _apply_filters(
        select(Site),
        commodity=commodity,
        region=region,
        stage=stage,
        site_type=site_type,
        search=None,
        project=project,
    )
    filtered = base_stmt.subquery()

    total_sites = db.scalar(select(func.count()).select_from(filtered)) or 0
    total_projects = db.scalar(
        select(func.count(func.distinct(filtered.c.project_code)))
    ) or 0

    def breakdown(column_name: str, limit: int | None = None) -> list[dict]:
        col = filtered.c[column_name]
        # Alphabetical tiebreaker on the label, same determinism rationale
        # as _apply_order's site_code and top_projects' project_code below:
        # tied counts are the norm here, and for by_lga the LIMIT 10 cutoff
        # means nondeterministic ties would make LGAs arbitrarily appear and
        # disappear from the dashboard between identical requests.
        stmt = (
            select(col, func.count().label("count"))
            .group_by(col)
            .order_by(func.count().desc(), col.asc().nulls_last())
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        return [
            {"label": label or "Unspecified", "count": count}
            for label, count in db.execute(stmt).all()
        ]

    # Projects with the most sites -- surfaces the site-vs-project grain
    # decision (multiple sites per project_code) that the rest of the
    # dashboard's per-site counts can't show. HAVING >= 2 because a
    # "multi-site projects" panel listing single-site projects would just
    # restate the sites list; secondary ORDER BY project_code keeps ties
    # deterministic (same reasoning as list_sites' site_code tiebreaker).
    top_projects_stmt = (
        select(
            filtered.c.project_code,
            filtered.c.project_title,
            func.count().label("site_count"),
        )
        .where(filtered.c.project_code.isnot(None))
        .group_by(filtered.c.project_code, filtered.c.project_title)
        .having(func.count() >= 2)
        .order_by(func.count().desc(), filtered.c.project_code.asc())
        .limit(8)
    )
    top_projects = [
        {"project_code": code, "project_title": title, "site_count": count}
        for code, title, count in db.execute(top_projects_stmt).all()
    ]

    return {
        "total_sites": total_sites,
        "total_projects": total_projects,
        "by_stage": breakdown("stage"),
        "by_site_type": breakdown("site_type"),
        "by_commodity": breakdown("target_group_name"),
        "by_region": breakdown("development_region"),
        # 65 distinct LGAs in the full dataset -- a chart of all of them is
        # unreadable, so only the top 10 ship; the rest stay queryable via
        # the sites list, not the dashboard.
        "by_lga": breakdown("lga_name", limit=10),
        "top_projects": top_projects,
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
