import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Site } from "../types/site";
import SiteDetailPage from "./SiteDetailPage";

function makeSite(code: string, overrides: Partial<Site> = {}): Site {
  return {
    site_code: code,
    project_code: "J001",
    project_title: "Alpha Project",
    title: `Site ${code}`,
    short_title: null,
    site_type: "Mine",
    subtype: null,
    stage: "Operating",
    target_group_name: "Gold",
    commodity_group_name: null,
    development_region: "Pilbara",
    lga_name: null,
    longitude: null,
    latitude: null,
    active_flag: "Y",
    ...overrides,
  };
}

// Routes fetches by URL: the detail fetch (/api/sites/{code}) and the
// related-sites fetch (/api/sites?project=...) hit the same stub.
function stubFetch(detail: Site, related: Site[]) {
  const fetchMock = vi.fn().mockImplementation((rawUrl: string) => {
    const url = String(rawUrl);
    const isListRequest = url.includes("?");
    const body = isListRequest
      ? { items: related, total: related.length, page: 1, page_size: 100 }
      : detail;
    return Promise.resolve({ ok: true, json: async () => body });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDetail(code: string) {
  render(
    <MemoryRouter initialEntries={[`/sites/${code}`]}>
      <Routes>
        <Route path="/sites/:siteCode" element={<SiteDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SiteDetailPage related sites", () => {
  it("lists the project's other sites, excluding the site being viewed", async () => {
    const s1 = makeSite("S001");
    const s2 = makeSite("S002");
    const s3 = makeSite("S003", { site_type: "Infrastructure", stage: "Proposed" });
    stubFetch(s1, [s1, s2, s3]); // the API returns ALL of the project's sites, self included

    renderDetail("S001");

    expect(await screen.findByText(/Related sites in this project/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Site S002" })).toHaveAttribute("href", "/sites/S002");
    expect(screen.getByRole("link", { name: "Site S003" })).toBeInTheDocument();
    // The viewed site itself must not appear as its own "related" site --
    // it's already the page heading.
    expect(screen.queryByRole("link", { name: "Site S001" })).not.toBeInTheDocument();
  });

  it("links to the full project-filtered sites view with the real ?project= filter", async () => {
    stubFetch(makeSite("S001"), [makeSite("S001"), makeSite("S002")]);
    renderDetail("S001");

    const viewAll = await screen.findByRole("link", { name: /View all 2 sites in this project/ });
    expect(viewAll).toHaveAttribute("href", "/sites?project=J001");
  });

  it("renders no related-sites section at all for a single-site project", async () => {
    const only = makeSite("S001");
    stubFetch(only, [only]); // project query returns just the site itself

    renderDetail("S001");

    await screen.findByRole("heading", { name: "Site S001" });
    await waitFor(() => {
      expect(screen.queryByText(/Related sites in this project/)).not.toBeInTheDocument();
    });
  });
});
