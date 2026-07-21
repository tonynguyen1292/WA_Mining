import { Link } from "react-router-dom";

// Author-referral targets. Content, not environment -- these belong in
// source (one place, test-pinned), not in an env var: they never differ
// between dev and prod, and a typo'd URL should fail a test, not a deploy.
const PORTFOLIO_URL = "https://vynguyen-perth.netlify.app";
const GITHUB_REPO_URL = "https://github.com/tonynguyen1292/WA_Mining";

// Same dataset facts the Dashboard's provenance strip hardcodes -- both are
// snapshot descriptions, and both are on the "after refreshing" checklist
// in DATABASES/README_database.md (found by searching the repo for 421).
const DATASET_FACTS = [
  { value: "421", label: "mine sites" },
  { value: "356", label: "projects" },
  { value: "10", label: "regions" },
];

const JOURNEY = [
  {
    title: "SQL cleaning pipeline",
    body: "Five SQL scripts turn the raw DMIRS download into an analysis-ready table — trimming, casing, and suffix rules live in exactly one place, and the app seeds from their output.",
  },
  {
    title: "Power BI dashboard",
    body: "The original portfolio deliverable: a report built on the cleaned table, before this grew into a product.",
  },
  {
    title: "FastAPI + PostgreSQL API",
    body: "A read-only API over the cleaned data — shared filter pipeline, allowlisted sorting, KPI aggregations, CSV export.",
  },
  {
    title: "React explorer + hardening",
    body: "This app: dashboard, searchable sites table, map, and detail pages with URL-synced state — backed by 100+ tests, CI gates, and Docker.",
  },
];

const STACK = [
  { area: "Data", tags: ["PostgreSQL", "SQL pipeline", "Power BI"] },
  { area: "Backend", tags: ["FastAPI", "SQLAlchemy 2.0", "Pydantic"] },
  { area: "Frontend", tags: ["React 18", "TypeScript", "Vite", "Recharts", "Leaflet"] },
  { area: "Quality & Ops", tags: ["pytest", "Vitest", "GitHub Actions", "Docker"] },
];

export default function AboutPage() {
  return (
    <div className="page about">
      <section className="about-hero">
        <h1>About this project</h1>
        <p className="about-hero-tagline">
          Western Australia's major resource projects, taken end-to-end: from a raw
          government dataset, through a SQL cleaning pipeline, to the full-stack
          explorer you're using right now.
        </p>
        <ul className="about-hero-facts">
          {DATASET_FACTS.map((fact) => (
            <li key={fact.label}>
              <strong>{fact.value}</strong> {fact.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <h2>From spreadsheet to full-stack</h2>
        <ol className="about-timeline">
          {JOURNEY.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h2>Under the hood</h2>
        <div className="about-stack-grid">
          {STACK.map((group) => (
            <div className="about-stack-card" key={group.area}>
              <h3>{group.area}</h3>
              <ul className="about-tags">
                {group.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Data &amp; licensing</h2>
        <p className="about-data-note">
          Source:{" "}
          <a
            href="https://dasc.dmirs.wa.gov.au/home?productAlias=MINEDEXMajorResProj"
            target="_blank"
            rel="noreferrer"
          >
            DMIRS MINEDEX Major Resource Projects
          </a>{" "}
          (May 2026 snapshot), published under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          . Every field the app shows is documented in the{" "}
          <a
            href="https://github.com/tonynguyen1292/WA_Mining/blob/main/data_dictionary.md"
            target="_blank"
            rel="noreferrer"
          >
            data dictionary
          </a>
          , and the cleaning rules are plain SQL you can read in the repository.
        </p>
      </section>

      <section className="about-author">
        <div>
          <h2>Built by Vy Nguyen</h2>
          <p>
            Business Analyst &amp; Data Analyst in Perth, WA. This project is part of a
            larger portfolio — the story behind it, and more work like it, lives on my
            portfolio site.
          </p>
        </div>
        <div className="about-author-links">
          <a className="about-button-primary" href={PORTFOLIO_URL} target="_blank" rel="noreferrer">
            Visit my portfolio
          </a>
          <a className="about-button-secondary" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </section>

      <section className="about-section">
        <h2>Explore the data</h2>
        <div className="about-explore">
          <Link to="/">Dashboard</Link>
          <Link to="/sites">Sites table</Link>
          <Link to="/map">Map</Link>
        </div>
      </section>
    </div>
  );
}
