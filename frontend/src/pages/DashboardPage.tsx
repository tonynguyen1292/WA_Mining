import { useEffect, useState } from "react";
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
            <BreakdownChart title="Sites by Stage" data={kpis.by_stage} color="#2f6f4f" />
            <BreakdownChart title="Sites by Commodity" data={kpis.by_commodity} color="#a15c2b" />
            <BreakdownChart title="Sites by Region" data={kpis.by_region} color="#3a5a78" />
          </div>
        </div>
      )}
    </div>
  );
}
