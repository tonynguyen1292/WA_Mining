import type {
  FilterOptions,
  KpiSummary,
  Site,
  SiteFilters,
  SiteListResponse,
} from "../types/site";

// VITE_API_BASE_URL is baked in at build time. An explicit value (dev's
// .env, or a prod build arg pointing at a different origin) always wins.
// Left unset: dev server falls back to the documented local backend port;
// a production build falls back to same-origin (nginx proxies /api there).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : window.location.origin);

type QueryValue = string | number | string[] | undefined;

// Carries the HTTP status so callers can tell "the server rejected this
// specific request" (422, a bad `sort`/filter value) apart from "the API is
// unreachable" -- those need different messages, and a plain Error loses
// the distinction. Once `sort` became URL-editable rather than purely
// UI-driven (via header clicks that only ever produce valid values), a
// hand-edited `?sort=bogus` became a request a real user can trigger, so
// this needed to surface the backend's actual validation message instead of
// a generic "is the API running?" that would be actively misleading here.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") continue;
      if (Array.isArray(value)) {
        // Repeated query params (?commodity=Gold&commodity=Nickel), matching
        // FastAPI's list[str] | None = Query(...) parsing on the backend.
        for (const item of value) url.searchParams.append(key, item);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function apiGet<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
  const res = await fetch(buildUrl(path, params));
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `${path} failed with ${res.status}`;
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export function fetchSites(
  filters: SiteFilters,
  page: number,
  pageSize: number,
  sort?: string
): Promise<SiteListResponse> {
  return apiGet<SiteListResponse>("/api/sites", {
    ...filters,
    sort,
    page,
    page_size: pageSize,
  });
}

export function fetchSite(siteCode: string): Promise<Site> {
  return apiGet<Site>(`/api/sites/${encodeURIComponent(siteCode)}`);
}

// A URL, not a fetch: the export is a browser-native download (the server
// answers with Content-Disposition: attachment), so the frontend's whole
// job is handing the browser an <a href> built from the same filter/sort
// serialization the table itself uses -- what you see is what you export.
export function buildSitesExportUrl(filters: SiteFilters, sort?: string): string {
  return buildUrl("/api/sites/export", { ...filters, sort });
}

export function fetchKpis(filters: SiteFilters): Promise<KpiSummary> {
  return apiGet<KpiSummary>("/api/kpis", { ...filters });
}

export function fetchFilterOptions(): Promise<FilterOptions> {
  return apiGet<FilterOptions>("/api/meta/filters");
}
