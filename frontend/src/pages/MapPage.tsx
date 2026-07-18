import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchSites } from "../api/client";
import FilterBar from "../components/FilterBar";
import SitesMap from "../components/SitesMap";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { filtersFromSearchParams, writeFiltersToSearchParams } from "../utils/urlFilters";
import type { Site, SiteFilters } from "../types/site";

// Plots every matching site at once rather than one paginated page --
// 500 covers the full 421-site dataset with headroom (see backend
// /api/sites page_size cap).
const MAP_PAGE_SIZE = 500;

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Same URL-as-source-of-truth-on-load pattern as SitesPage, scoped down
  // to filters only -- the map has no pagination or sort concept.
  const [filters, setFilters] = useState<SiteFilters>(() => filtersFromSearchParams(searchParams));
  const debouncedFilters = useDebouncedValue(filters);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastWrittenSearch = useRef(searchParams.toString());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const nextParams = writeFiltersToSearchParams(searchParams, debouncedFilters);
    const nextSearch = nextParams.toString();
    if (nextSearch !== searchParams.toString()) {
      lastWrittenSearch.current = nextSearch;
      setSearchParams(nextParams, { replace: true });
    }

    fetchSites(debouncedFilters, 1, MAP_PAGE_SIZE)
      .then((data) => {
        if (!cancelled) setSites(data.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load sites. Is the API running?");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters]);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === lastWrittenSearch.current) return;

    setFilters(filtersFromSearchParams(searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="page">
      <h1>Map</h1>
      <p className="page-subtitle">
        {sites.length || ""} sites plotted by location, colored by stage.
      </p>

      <FilterBar filters={filters} onChange={setFilters} />

      {error && <p className="error-note">{error}</p>}
      {isLoading && sites.length === 0 && <p className="loading-note">Loading map…</p>}

      {sites.length > 0 && <SitesMap sites={sites} />}
    </div>
  );
}
