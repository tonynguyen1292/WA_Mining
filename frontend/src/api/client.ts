import type {
  FilterOptions,
  KpiSummary,
  Site,
  SiteFilters,
  SiteListResponse,
} from "../types/site";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type QueryValue = string | number | string[] | undefined;

async function apiGet<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
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

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchSites(
  filters: SiteFilters,
  page: number,
  pageSize: number
): Promise<SiteListResponse> {
  return apiGet<SiteListResponse>("/api/sites", {
    ...filters,
    page,
    page_size: pageSize,
  });
}

export function fetchSite(siteCode: string): Promise<Site> {
  return apiGet<Site>(`/api/sites/${encodeURIComponent(siteCode)}`);
}

export function fetchKpis(filters: SiteFilters): Promise<KpiSummary> {
  return apiGet<KpiSummary>("/api/kpis", { ...filters });
}

export function fetchFilterOptions(): Promise<FilterOptions> {
  return apiGet<FilterOptions>("/api/meta/filters");
}
