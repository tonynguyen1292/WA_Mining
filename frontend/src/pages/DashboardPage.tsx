import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchKpis } from "../api/client";
import BreakdownChart from "../components/charts/BreakdownChart";
import FilterBar from "../components/FilterBar";
import KpiCard from "../components/KpiCard";
import useDebouncedValue from "../hooks/useDebouncedValue";
import type { BreakdownItem, KpiSummary, SiteFilters } from "../types/site";

function countFor(items: BreakdownItem[], label: string): number {
  return items.find((item) => item.label === label)?.count ?? 0;
}

export default function DashboardPage() {
  const [filters, setFilters] = useState<SiteFilters>({});
  const debouncedFilters = useDebouncedValue(filters);
  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchKpis(debouncedFilters)
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load portfolio KPIs. Is the API running?");
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
      <h1>Portfolio Overview</h1>
      <p className="page-subtitle">
        WA Major Resource Projects — filter the portfolio to see how it reshapes the numbers below.
      </p>

      <FilterBar filters={filters} onChange={setFilters} showSearch={false} />

      {error && <p className="error-note">{error}</p>}

      {isLoading && !kpis && <p className="loading-note">Loading portfolio metrics…</p>}

      {kpis && (
        <div className={isLoading ? "is-refreshing" : undefined}>
          <div className="kpi-row">
            <KpiCard label="Total Sites" value={kpis.total_sites} />
            <KpiCard label="Total Projects" value={kpis.total_projects} />
            <KpiCard label="Operating" value={countFor(kpis.by_stage, "Operating")} />
            <KpiCard label="Mines" value={countFor(kpis.by_site_type, "Mine")} />
          </div>

          <div className="chart-grid">
            <BreakdownChart title="Sites by Stage" data={kpis.by_stage} color="#2f6f4f" linkField="stage" />
            <BreakdownChart
              title="Sites by Commodity"
              data={kpis.by_commodity}
              color="#a15c2b"
              linkField="commodity"
            />
            <BreakdownChart title="Sites by Region" data={kpis.by_region} color="#3a5a78" linkField="region" />
          </div>

          <div className="chart-grid">
            {/* No linkField: the sites list has no LGA filter (yet), so a
                bar click would have nowhere honest to land. */}
            <BreakdownChart
              title="Sites by Local Government Area (top 10)"
              data={kpis.by_lga}
              color="#6d5a8f"
              maxItems={10}
            />

            <div className="chart-card">
              <h3>Projects with the most sites</h3>
              {kpis.top_projects.length === 0 ? (
                <p className="empty-note">No multi-site projects match the current filters.</p>
              ) : (
                <ol className="top-projects">
                  {kpis.top_projects.map((project) => (
                    <li key={project.project_code}>
                      <Link
                        to={`/sites?project=${encodeURIComponent(project.project_code)}`}
                        title="Open every site in this project"
                      >
                        {project.project_title ?? project.project_code}
                      </Link>
                      <span className="top-projects-count">
                        {project.site_count} sites
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="chart-hint">
                One project can span several sites — mine, processing plant, port. That's why{" "}
                {kpis.total_sites} sites roll up to {kpis.total_projects} projects.
              </p>
            </div>
          </div>

          <div className="provenance">
            Data:{" "}
            <a
              href="https://dasc.dmirs.wa.gov.au/home?productAlias=MINEDEXMajorResProj"
              target="_blank"
              rel="noreferrer"
            >
              DMIRS MINEDEX Major Resource Projects
            </a>{" "}
            — May 2026 snapshot ·{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>{" "}
            · 421 sites across 356 projects, 10 development regions, 65 local government areas ·{" "}
            <a
              href="https://github.com/tonynguyen1292/WA_Mining/blob/main/data_dictionary.md"
              target="_blank"
              rel="noreferrer"
            >
              Data dictionary
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
