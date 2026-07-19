import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError, buildSitesExportUrl, fetchSites } from "../api/client";
import FilterBar from "../components/FilterBar";
import SitesTable from "../components/SitesTable";
import useDebouncedValue from "../hooks/useDebouncedValue";
import {
  filtersFromSearchParams,
  pageFromSearchParams,
  sortFromSearchParams,
  writeFiltersToSearchParams,
} from "../utils/urlFilters";
import type { Site, SiteFilters } from "../types/site";

const PAGE_SIZE = 25;

export default function SitesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lazy-initialized from the URL so a reload, a pasted link, or a bookmark
  // restores the exact filter/page/sort state instead of always starting
  // from a blank slate.
  const [filters, setFilters] = useState<SiteFilters>(() => filtersFromSearchParams(searchParams));
  const [sort, setSort] = useState<string | undefined>(() => sortFromSearchParams(searchParams));
  const [page, setPage] = useState(() => pageFromSearchParams(searchParams));
  const debouncedFilters = useDebouncedValue(filters);

  const [items, setItems] = useState<Site[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Distinguishes "the URL just changed because *we* wrote it below" from
  // "the URL changed from outside this component" (back/forward, a pasted
  // link, a hand-edited address bar). Seeded to the initial URL string,
  // since state and URL start in agreement by construction (both are
  // derived from the same searchParams on mount) -- without that seed, the
  // URL->state effect would immediately re-parse and re-set state on mount
  // for no reason.
  const lastWrittenSearch = useRef(searchParams.toString());

  // State -> URL (+ fetch). Fires exactly when the *debounced* filters, or
  // sort/page, change -- i.e. exactly when a new request is about to go
  // out, so the URL always mirrors what's actually displayed rather than an
  // in-progress keystroke. Uses `replace` (not `push`) so rapid filter
  // tweaks or pagination clicks don't flood browser history -- Back returns
  // to wherever the user actually navigated from, while the URL still fully
  // captures current state for sharing/bookmarking.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const nextParams = writeFiltersToSearchParams(searchParams, debouncedFilters);
    if (sort) nextParams.set("sort", sort);
    else nextParams.delete("sort");
    if (page > 1) nextParams.set("page", String(page));
    else nextParams.delete("page");

    const nextSearch = nextParams.toString();
    if (nextSearch !== searchParams.toString()) {
      lastWrittenSearch.current = nextSearch;
      setSearchParams(nextParams, { replace: true });
    }

    fetchSites(debouncedFilters, page, PAGE_SIZE, sort)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        // A 422 here means someone reached this page with an invalid `sort`
        // (or, in principle, filter) value in the URL -- previously
        // unreachable since sort only ever came from validated header
        // clicks. The API is fine in that case; say so specifically instead
        // of the generic "is the API running?" message, which would imply
        // the wrong problem.
        setError(
          err instanceof ApiError && err.status === 422
            ? err.message
            : "Could not load sites. Is the API running?"
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, sort, page]);

  // URL -> state. Fires whenever the URL changes from outside this
  // component's own writes above (back/forward navigation, a pasted deep
  // link, or the address bar edited directly), and resyncs local state to
  // match. Skipped when the change matches what the effect above just
  // wrote, which is what stops the two effects from ping-ponging each other
  // into a loop.
  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (currentSearch === lastWrittenSearch.current) return;

    setFilters(filtersFromSearchParams(searchParams));
    setPage(pageFromSearchParams(searchParams));
    setSort(sortFromSearchParams(searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

      <div className="sites-toolbar">
        {/* Built from debouncedFilters + sort -- the same values the table's
            own fetch uses -- so the downloaded CSV always matches the rows
            on screen (all of them, not just the current page). */}
        {total > 0 ? (
          <a className="export-csv" href={buildSitesExportUrl(debouncedFilters, sort)}>
            Export CSV · {total} site{total === 1 ? "" : "s"}
          </a>
        ) : (
          <span className="export-csv is-disabled" aria-disabled="true">
            Export CSV
          </span>
        )}
      </div>

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
