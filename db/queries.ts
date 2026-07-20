import {
  and,
  asc,
  countDistinct,
  eq,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "./index.js";
import { sites, type SiteRow } from "./schema.js";

/**
 * Query logic for the sites listing and portfolio KPIs.
 *
 * A direct port of the FastAPI service layer (backend/app/services/
 * portfolio_service.py) onto Drizzle + Netlify Database, preserving its
 * behaviour: the sort allowlist, LIKE-metacharacter escaping, deterministic
 * tiebreakers, nulls-last ordering, and the KPI breakdown/top-projects
 * shapes the existing React frontend already renders.
 */

// Allowlist: the only columns /api/sites will sort by, and the exact strings
// the `sort` query param accepts (prefix with "-" for descending).
// Deliberately not a passthrough of arbitrary column names to ORDER BY.
const SORTABLE_COLUMNS = {
  title: sites.title,
  project_title: sites.project_title,
  site_type: sites.site_type,
  stage: sites.stage,
  target_group_name: sites.target_group_name,
  development_region: sites.development_region,
} as const;

export const SORTABLE_FIELDS = Object.keys(SORTABLE_COLUMNS).sort();

export class InvalidSortField extends Error {}

export interface SiteFilters {
  commodity?: string[];
  region?: string[];
  stage?: string[];
  site_type?: string[];
  project?: string[];
  search?: string;
}

function resolveSort(sort?: string | null): { column: SQL | any; descending: boolean } | null {
  if (!sort) return null;
  const descending = sort.startsWith("-");
  const field = descending ? sort.slice(1) : sort;
  const column = (SORTABLE_COLUMNS as Record<string, unknown>)[field];
  if (!column) {
    throw new InvalidSortField(
      `Cannot sort by '${field}'. Valid fields: ${SORTABLE_FIELDS.join(", ")} ` +
        "(prefix with '-' for descending).",
    );
  }
  return { column: column as any, descending };
}

function buildFilters(f: SiteFilters): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.commodity?.length) conds.push(inArray(sites.target_group_name, f.commodity));
  if (f.region?.length) conds.push(inArray(sites.development_region, f.region));
  if (f.stage?.length) conds.push(inArray(sites.stage, f.stage));
  if (f.site_type?.length) conds.push(inArray(sites.site_type, f.site_type));
  // Filters by project_code (the stable identifier), not project_title.
  if (f.project?.length) conds.push(inArray(sites.project_code, f.project));
  if (f.search) {
    // Escape LIKE metacharacters so user input matches literally. Postgres'
    // default LIKE escape character is backslash, so escaping \ % _ is
    // sufficient without an explicit ESCAPE clause.
    const escaped = f.search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const like = `%${escaped}%`;
    conds.push(
      or(
        sql`${sites.title} ILIKE ${like}`,
        sql`${sites.project_title} ILIKE ${like}`,
        sql`${sites.site_code} ILIKE ${like}`,
      ),
    );
  }
  const defined = conds.filter((c): c is SQL => c !== undefined);
  return defined.length ? and(...defined) : undefined;
}

// site_code is appended as a stable tiebreaker on every query, sorted or not
// -- several columns are low-cardinality enough that without a deterministic
// secondary key, tied rows aren't consistently ordered across requests,
// which surfaces as pagination bugs rather than an obvious error.
function orderExprs(sort?: string | null): SQL[] {
  const resolved = resolveSort(sort);
  const primary = resolved
    ? sql`${resolved.column} ${sql.raw(resolved.descending ? "desc" : "asc")} nulls last`
    : sql`${sites.title} asc nulls last`;
  return [primary, sql`${sites.site_code} asc`];
}

function toNumber(v: string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Casts numeric(10,6) longitude/latitude (returned as strings by the driver)
// back to `number | null`, matching frontend/src/types/site.ts.
function serializeSite(row: SiteRow) {
  return { ...row, longitude: toNumber(row.longitude), latitude: toNumber(row.latitude) };
}

export async function listSites(
  f: SiteFilters,
  sort: string | undefined,
  page: number,
  pageSize: number,
) {
  // Validate `sort` up front so a bad value is a 422 before any DB round-trip.
  const order = orderExprs(sort);
  const where = buildFilters(f);

  const totalRows = await db.select({ c: sql<number>`count(*)::int` }).from(sites).where(where);
  const total = totalRows[0]?.c ?? 0;

  const items = await db
    .select()
    .from(sites)
    .where(where)
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items: items.map(serializeSite), total, page, page_size: pageSize };
}

export async function listSitesForExport(f: SiteFilters, sort?: string) {
  const order = orderExprs(sort); // validate `sort` before querying
  const where = buildFilters(f);
  const rows = await db
    .select()
    .from(sites)
    .where(where)
    .orderBy(...order);
  return rows.map(serializeSite);
}

export async function getSite(siteCode: string) {
  const rows = await db.select().from(sites).where(eq(sites.site_code, siteCode)).limit(1);
  return rows.length ? serializeSite(rows[0]) : null;
}

async function breakdown(where: SQL | undefined, column: any, limit?: number) {
  let q = db
    .select({ label: column, count: sql<number>`count(*)::int` })
    .from(sites)
    .where(where)
    .groupBy(column)
    // Alphabetical tiebreaker on the label keeps tied counts deterministic --
    // matters for the limited breakdowns (e.g. by_lga's top 10) so entries
    // don't arbitrarily appear/disappear between identical requests.
    .orderBy(sql`count(*) desc`, sql`${column} asc nulls last`)
    .$dynamic();
  if (limit !== undefined) q = q.limit(limit);
  const rows = await q;
  return rows.map((r) => ({ label: (r.label as string | null) || "Unspecified", count: r.count }));
}

export async function getKpis(f: SiteFilters) {
  const where = buildFilters(f);

  const totalSitesRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(sites)
    .where(where);
  const total_sites = totalSitesRows[0]?.c ?? 0;

  const totalProjectsRows = await db
    .select({ c: countDistinct(sites.project_code) })
    .from(sites)
    .where(where);
  const total_projects = Number(totalProjectsRows[0]?.c ?? 0);

  // Projects with the most sites (>= 2), deterministic on ties via
  // project_code -- mirrors the FastAPI top_projects query.
  const topProjectRows = await db
    .select({
      project_code: sites.project_code,
      project_title: sites.project_title,
      site_count: sql<number>`count(*)::int`,
    })
    .from(sites)
    .where(where ? and(where, isNotNull(sites.project_code)) : isNotNull(sites.project_code))
    .groupBy(sites.project_code, sites.project_title)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`count(*) desc`, asc(sites.project_code))
    .limit(8);

  const [by_stage, by_site_type, by_commodity, by_region, by_lga] = await Promise.all([
    breakdown(where, sites.stage),
    breakdown(where, sites.site_type),
    breakdown(where, sites.target_group_name),
    breakdown(where, sites.development_region),
    // 65 distinct LGAs in the full dataset -- only the top 10 ship to the
    // dashboard; the rest stay queryable via the sites list.
    breakdown(where, sites.lga_name, 10),
  ]);

  return {
    total_sites,
    total_projects,
    by_stage,
    by_site_type,
    by_commodity,
    by_region,
    by_lga,
    top_projects: topProjectRows,
  };
}

export async function getFilterOptions() {
  async function distinct(column: any): Promise<string[]> {
    const rows = await db
      .selectDistinct({ v: column })
      .from(sites)
      .where(isNotNull(column))
      .orderBy(asc(column));
    return rows.map((r) => r.v as string).filter((v) => v !== null);
  }
  const [commodities, regions, stages, site_types] = await Promise.all([
    distinct(sites.target_group_name),
    distinct(sites.development_region),
    distinct(sites.stage),
    distinct(sites.site_type),
  ]);
  return { commodities, regions, stages, site_types };
}

// --- CSV export ---------------------------------------------------------

// Column order + human-readable labels for the CSV export, matching the
// FastAPI export (site identity, then classification, then location).
const EXPORT_COLUMNS: [keyof SiteRow, string][] = [
  ["site_code", "Site Code"],
  ["project_code", "Project Code"],
  ["project_title", "Project"],
  ["title", "Site Title"],
  ["short_title", "Short Title"],
  ["site_type", "Site Type"],
  ["subtype", "Subtype"],
  ["stage", "Stage"],
  ["target_group_name", "Commodity"],
  ["commodity_group_name", "Commodity Group"],
  ["development_region", "Development Region"],
  ["lga_name", "Local Government Area"],
  ["longitude", "Longitude"],
  ["latitude", "Latitude"],
  ["active_flag", "Active"],
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote when the value contains a delimiter, quote, or newline; escape
  // embedded quotes by doubling. Project titles here really do contain
  // commas and slashes.
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function sitesToCsv(rows: ReturnType<typeof serializeSite>[]): string {
  const lines = [EXPORT_COLUMNS.map(([, label]) => csvCell(label)).join(",")];
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map(([col]) => csvCell((row as any)[col])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
