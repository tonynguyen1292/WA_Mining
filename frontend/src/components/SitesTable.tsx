import { Link } from "react-router-dom";
import type { Site } from "../types/site";

// Matches backend SORTABLE_COLUMNS in portfolio_service.py -- keep in sync,
// since a mismatch here means a header that clicks into a 422 from the API.
const SORT_COLUMNS: { key: string; label: string }[] = [
  { key: "title", label: "Site" },
  { key: "project_title", label: "Project" },
  { key: "site_type", label: "Type" },
  { key: "stage", label: "Stage" },
  { key: "target_group_name", label: "Commodity" },
  { key: "development_region", label: "Region" },
];

interface SitesTableProps {
  items: Site[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sort?: string;
  onSortChange: (sort: string) => void;
  isLoading?: boolean;
}

export default function SitesTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  sort,
  onSortChange,
  isLoading = false,
}: SitesTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeField = sort?.startsWith("-") ? sort.slice(1) : sort;
  const activeDescending = sort?.startsWith("-") ?? false;

  function handleHeaderClick(key: string) {
    if (activeField !== key) {
      onSortChange(key);
    } else if (!activeDescending) {
      onSortChange(`-${key}`);
    } else {
      onSortChange(key);
    }
  }

  return (
    <div className="sites-table-wrap">
      <table className="sites-table">
        <thead>
          <tr>
            {SORT_COLUMNS.map(({ key, label }) => {
              const isActive = activeField === key;
              return (
                <th key={key}>
                  <button
                    type="button"
                    className={`sites-table-sort${isActive ? " is-active" : ""}`}
                    onClick={() => handleHeaderClick(key)}
                  >
                    {label}
                    {isActive && (
                      <span className="sites-table-sort-indicator">
                        {activeDescending ? "▼" : "▲"}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && items.length === 0 ? (
            <tr>
              <td colSpan={6} className="loading-note">
                Loading sites…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-note">
                No sites match the current filters.
              </td>
            </tr>
          ) : (
            items.map((site) => (
              <tr key={site.site_code}>
                <td>
                  <Link to={`/sites/${site.site_code}`}>{site.title ?? site.site_code}</Link>
                </td>
                <td>{site.project_title ?? "—"}</td>
                <td>{site.site_type ?? "—"}</td>
                <td>
                  <span className="stage-pill">{site.stage ?? "—"}</span>
                </td>
                <td>{site.target_group_name ?? "—"}</td>
                <td>{site.development_region ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages} &middot; {total} sites
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
