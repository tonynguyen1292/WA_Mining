import { InvalidSortField } from "../../db/queries.js";

/** Parse repeatable query params (?commodity=Gold&commodity=Nickel). */
export function multi(url: URL, key: string): string[] | undefined {
  const values = url.searchParams.getAll(key);
  return values.length ? values : undefined;
}

export function single(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key);
  return value === null || value === "" ? undefined : value;
}

/** The filter set shared by /api/sites, /api/sites/export and /api/kpis. */
export function parseFilters(url: URL) {
  return {
    commodity: multi(url, "commodity"),
    region: multi(url, "region"),
    stage: multi(url, "stage"),
    site_type: multi(url, "site_type"),
    project: multi(url, "project"),
    search: single(url, "search"),
  };
}

/**
 * Every /api response is uncacheable, successes and errors alike.
 *
 * Ports the app-wide middleware in backend/app/main.py (WMDP2-69, risk
 * R4): after a re-seed, a cached JSON payload for an identical request URL
 * shows old data with no error anywhere, and this dataset is small enough
 * that re-fetching always beats debugging staleness. Without this the
 * deployed API fell back to Netlify's platform default (`no-cache`), so
 * the CSV export -- which sets its own header in sites.mts -- was the only
 * endpoint actually carrying the app's intent.
 *
 * `/health` is deliberately outside the /api prefix and stays unstamped,
 * matching the Python scoping; health.mts builds its own Response rather
 * than going through these helpers, so it is unaffected by design.
 */
const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

/**
 * Maps a thrown error to an HTTP response. An invalid `sort` value becomes a
 * 422 carrying the backend's validation message (matching the FastAPI API the
 * frontend's ApiError handling expects); anything else is a 500.
 */
export function errorResponse(err: unknown): Response {
  if (err instanceof InvalidSortField) {
    return jsonResponse({ detail: err.message }, 422);
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return jsonResponse({ detail: message }, 500);
}
