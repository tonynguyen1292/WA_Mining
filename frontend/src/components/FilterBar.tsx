import { useEffect, useState } from "react";
import { fetchFilterOptions } from "../api/client";
import type { FilterOptions, SiteFilters } from "../types/site";

interface FilterBarProps {
  filters: SiteFilters;
  onChange: (filters: SiteFilters) => void;
}

const EMPTY_OPTIONS: FilterOptions = {
  commodities: [],
  regions: [],
  stages: [],
  site_types: [],
};

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);

  useEffect(() => {
    fetchFilterOptions()
      .then(setOptions)
      .catch(() => setOptions(EMPTY_OPTIONS));
  }, []);

  function set(field: keyof SiteFilters, value: string) {
    onChange({ ...filters, [field]: value || undefined });
  }

  return (
    <div className="filter-bar">
      <input
        type="text"
        placeholder="Search site, project, or code..."
        value={filters.search ?? ""}
        onChange={(e) => set("search", e.target.value)}
        className="filter-search"
      />

      <select value={filters.commodity ?? ""} onChange={(e) => set("commodity", e.target.value)}>
        <option value="">All commodities</option>
        {options.commodities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select value={filters.region ?? ""} onChange={(e) => set("region", e.target.value)}>
        <option value="">All regions</option>
        {options.regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select value={filters.stage ?? ""} onChange={(e) => set("stage", e.target.value)}>
        <option value="">All stages</option>
        {options.stages.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select value={filters.site_type ?? ""} onChange={(e) => set("site_type", e.target.value)}>
        <option value="">All site types</option>
        {options.site_types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {Object.values(filters).some(Boolean) && (
        <button type="button" className="filter-clear" onClick={() => onChange({})}>
          Clear filters
        </button>
      )}
    </div>
  );
}
