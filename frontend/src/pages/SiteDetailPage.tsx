import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchSite, fetchSites } from "../api/client";
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

// Covers every real project size: the dataset's largest project has 4
// sites, and /api/sites caps page_size at 500 anyway.
const RELATED_FETCH_SIZE = 100;

export default function SiteDetailPage() {
  const { siteCode } = useParams<{ siteCode: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [relatedSites, setRelatedSites] = useState<Site[]>([]);

  useEffect(() => {
    if (!siteCode) return;
    setSite(null);
    setNotFound(false);
    setRelatedSites([]);

    fetchSite(siteCode)
      .then(setSite)
      .catch(() => setNotFound(true));
  }, [siteCode]);

  // Second fetch, keyed off the loaded site's project_code: the same
  // ?project= filter the dashboard's top-projects links use, not a
  // dedicated /related endpoint -- one backend mechanism, two consumers.
  useEffect(() => {
    const projectCode = site?.project_code;
    if (!projectCode) return;

    let cancelled = false;
    fetchSites({ project: [projectCode] }, 1, RELATED_FETCH_SIZE)
      .then((data) => {
        if (cancelled) return;
        setRelatedSites(data.items.filter((s) => s.site_code !== site.site_code));
      })
      .catch(() => {
        // Related sites are supplementary -- a failed fetch degrades to
        // the section simply not rendering, same as a single-site project.
        if (!cancelled) setRelatedSites([]);
      });

    return () => {
      cancelled = true;
    };
  }, [site]);

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

      {/* Rendered only when siblings actually exist: most projects have a
          single site, and an empty "Related sites" heading would just be
          noise on every one of those pages. */}
      {relatedSites.length > 0 && (
        <section className="related-sites">
          <h2>
            Related sites in this project
            {site.project_title ? ` — ${site.project_title}` : ""}
          </h2>
          <ul>
            {relatedSites.map((related) => (
              <li key={related.site_code}>
                <Link to={`/sites/${related.site_code}`}>{related.title ?? related.site_code}</Link>
                <span className="related-sites-meta">
                  {related.site_type ?? "—"} · {related.stage ?? "—"}
                </span>
              </li>
            ))}
          </ul>
          {site.project_code && (
            <Link className="related-sites-all" to={`/sites?project=${encodeURIComponent(site.project_code)}`}>
              View all {relatedSites.length + 1} sites in this project →
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
