import { useEffect, useState } from "react";
import { fetchSites } from "../api/client";
import FilterBar from "../components/FilterBar";
import SitesMap from "../components/SitesMap";
import useDebouncedValue from "../hooks/useDebouncedValue";
import type { Site, SiteFilters } from "../types/site";

// Plots every matching site at once rather than one paginated page --
// 500 covers the full 421-site dataset with headroom (see backend
// /api/sites page_size cap).
const MAP_PAGE_SIZE = 500;

export default function MapPage() {
  const [filters, setFilters] = useState<SiteFilters>({});
  const debouncedFilters = useDebouncedValue(filters);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

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
  }, [debouncedFilters]);

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
