import { useEffect, useState } from "react";
import { fetchFilterOptions } from "../api/client";
import type { FilterOptions, SiteFilters } from "../types/site";
import MultiSelect from "./MultiSelect";

interface FilterBarProps {
  filters: SiteFilters;
  onChange: (filters: SiteFilters) => void;
  /** /api/kpis doesn't support free-text search, so hide it on pages backed by that endpoint. */
  showSearch?: boolean;
}

const EMPTY_OPTIONS: FilterOptions = {
  commodities: [],
  regions: [],
  stages: [],
  site_types: [],
};

export default function FilterBar({ filters, onChange, showSearch = true }: FilterBarProps) {
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);

  useEffect(() => {
    fetchFilterOptions()
      .then(setOptions)
      .catch(() => setOptions(EMPTY_OPTIONS));
  }, []);

  function setList(field: keyof SiteFilters, values: string[]) {
    onChange({ ...filters, [field]: values.length > 0 ? values : undefined });
  }

  function hasAnyFilter(): boolean {
    return Object.values(filters).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));
  }

  return (
    <div className="filter-bar">
      {showSearch && (
        <input
          type="text"
          placeholder="Search site, project, or code..."
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="filter-search"
        />
      )}

      <MultiSelect
        label="commodities"
        options={options.commodities}
        selected={filters.commodity ?? []}
        onChange={(values) => setList("commodity", values)}
      />

      <MultiSelect
        label="regions"
        options={options.regions}
        selected={filters.region ?? []}
        onChange={(values) => setList("region", values)}
      />

      <MultiSelect
        label="stages"
        options={options.stages}
        selected={filters.stage ?? []}
        onChange={(values) => setList("stage", values)}
      />

      <MultiSelect
        label="site types"
        options={options.site_types}
        selected={filters.site_type ?? []}
        onChange={(values) => setList("site_type", values)}
      />

      {hasAnyFilter() && (
        <button type="button" className="filter-clear" onClick={() => onChange({})}>
          Clear filters
        </button>
      )}
    </div>
  );
}
