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

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Maps a thrown error to an HTTP response. An invalid `sort` value becomes a
 * 422 carrying the backend's validation message (matching the FastAPI API the
 * frontend's ApiError handling expects); anything else is a 500.
 */
export function errorResponse(err: unknown): Response {
  if (err instanceof InvalidSortField) {
    return Response.json({ detail: err.message }, { status: 422 });
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return Response.json({ detail: message }, { status: 500 });
}
