import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchSite } from "../api/client";
import type { Site } from "../types/site";

const FIELD_LABELS: Array<[keyof Site, string]> = [
  ["project_title", "Project"],
  ["project_code", "Project Code"],
  ["site_type", "Site Type"],
  ["subtype", "Subtype"],
  ["stage", "Stage"],
  ["target_group_name", "Commodity"],
  ["commodity_group_name", "Commodity Group"],
  ["development_region", "Development Region"],
  ["lga_name", "Local Government Area"],
  ["longitude", "Longitude"],
  ["latitude", "Latitude"],
  ["active_flag", "Active"],
];

export default function SiteDetailPage() {
  const { siteCode } = useParams<{ siteCode: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!siteCode) return;
    setSite(null);
    setNotFound(false);

    fetchSite(siteCode)
      .then(setSite)
      .catch(() => setNotFound(true));
  }, [siteCode]);

  if (notFound) {
    return (
      <div className="page">
        <p className="error-note">Site "{siteCode}" was not found.</p>
        <Link to="/sites">Back to sites</Link>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/sites" className="back-link">
        &larr; Back to sites
      </Link>
      <h1>{site.title ?? site.site_code}</h1>
      <p className="page-subtitle">
        {site.short_title && site.short_title !== site.title ? `${site.short_title} · ` : ""}
        {site.site_code}
      </p>

      <dl className="detail-list">
        {FIELD_LABELS.map(([field, label]) => (
          <div className="detail-row" key={field}>
            <dt>{label}</dt>
            <dd>{site[field] ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
