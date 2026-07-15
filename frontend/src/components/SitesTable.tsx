import { Link } from "react-router-dom";
import type { Site } from "../types/site";

interface SitesTableProps {
  items: Site[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function SitesTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading = false,
}: SitesTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="sites-table-wrap">
      <table className="sites-table">
        <thead>
          <tr>
            <th>Site</th>
            <th>Project</th>
            <th>Type</th>
            <th>Stage</th>
            <th>Commodity</th>
            <th>Region</th>
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
