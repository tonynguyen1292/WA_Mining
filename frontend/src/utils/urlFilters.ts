import type { SiteFilters } from "../types/site";

// The array-valued filter fields, in the exact form the backend accepts as
// repeated query params (?commodity=Gold&commodity=Nickel) -- reusing the
// same keys in the URL means the address bar and the network tab always
// show identical query strings, with no separate translation layer.
const ARRAY_FILTER_KEYS = ["commodity", "region", "stage", "site_type"] as const;

export function filtersFromSearchParams(params: URLSearchParams): SiteFilters {
  const filters: SiteFilters = {};
  for (const key of ARRAY_FILTER_KEYS) {
    const values = params.getAll(key);
    if (values.length > 0) filters[key] = values;
  }
  const search = params.get("search");
  if (search) filters.search = search;
  return filters;
}

// Returns a new URLSearchParams with the filter keys replaced by `filters`,
// preserving any other keys already present (e.g. page/sort) untouched --
// callers layer those on separately, since not every page that has filters
// also has pagination or sorting (the map page doesn't).
export function writeFiltersToSearchParams(
  params: URLSearchParams,
  filters: SiteFilters
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of ARRAY_FILTER_KEYS) {
    next.delete(key);
    for (const value of filters[key] ?? []) next.append(key, value);
  }
  if (filters.search) next.set("search", filters.search);
  else next.delete("search");
  return next;
}

// Maps a dashboard breakdown chart to the /sites filter its bars can deep-
// link into. Returns null for the synthetic "Unspecified" bucket (it stands
// for NULL, which the sites list can't filter on) -- callers render those
// bars as plain, non-clickable marks rather than dead links.
export function sitesLinkForBreakdown(
  field: "stage" | "commodity" | "region" | "site_type",
  label: string
): string | null {
  if (label === "Unspecified") return null;
  const params = new URLSearchParams();
  params.append(field, label);
  return `/sites?${params.toString()}`;
}

export function pageFromSearchParams(params: URLSearchParams): number {
  const raw = params.get("page");
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function sortFromSearchParams(params: URLSearchParams): string | undefined {
  return params.get("sort") ?? undefined;
}
