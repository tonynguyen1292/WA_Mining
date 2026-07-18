import { useEffect, useState } from "react";
import { fetchSites } from "../api/client";
import FilterBar from "../components/FilterBar";
import SitesTable from "../components/SitesTable";
import useDebouncedValue from "../hooks/useDebouncedValue";
import type { Site, SiteFilters } from "../types/site";

const PAGE_SIZE = 25;

export default function SitesPage() {
  const [filters, setFilters] = useState<SiteFilters>({});
  const debouncedFilters = useDebouncedValue(filters);
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Site[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // sort is intentionally not debounced -- unlike filters/search, a header
    // click is a single discrete action, not fast keystrokes, so there's no
    // typing burst to coalesce and the user expects an immediate reorder.
    fetchSites(debouncedFilters, page, PAGE_SIZE, sort)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
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
  }, [debouncedFilters, sort, page]);

  function handleFiltersChange(next: SiteFilters) {
    setFilters(next);
    setPage(1); // reset paging whenever the filter set changes
  }

  function handleSortChange(next: string) {
    setSort(next);
    setPage(1); // reset paging whenever the sort changes, same as filters
  }

  return (
    <div className="page">
      <h1>Sites</h1>
      <p className="page-subtitle">Browse and search all {total || ""} sites in the portfolio.</p>

      <FilterBar filters={filters} onChange={handleFiltersChange} />

      {error && <p className="error-note">{error}</p>}

      <SitesTable
        items={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        sort={sort}
        onSortChange={handleSortChange}
        isLoading={isLoading}
      />
    </div>
  );
}
