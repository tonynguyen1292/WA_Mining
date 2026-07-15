export interface Site {
  site_code: string;
  project_code: string | null;
  project_title: string | null;
  title: string | null;
  short_title: string | null;
  site_type: string | null;
  subtype: string | null;
  stage: string | null;
  target_group_name: string | null;
  commodity_group_name: string | null;
  development_region: string | null;
  lga_name: string | null;
  longitude: number | null;
  latitude: number | null;
  active_flag: string | null;
}

export interface SiteListResponse {
  items: Site[];
  total: number;
  page: number;
  page_size: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface KpiSummary {
  total_sites: number;
  total_projects: number;
  by_stage: BreakdownItem[];
  by_site_type: BreakdownItem[];
  by_commodity: BreakdownItem[];
  by_region: BreakdownItem[];
}

export interface FilterOptions {
  commodities: string[];
  regions: string[];
  stages: string[];
  site_types: string[];
}

export interface SiteFilters {
  commodity?: string[];
  region?: string[];
  stage?: string[];
  site_type?: string[];
  search?: string;
}
