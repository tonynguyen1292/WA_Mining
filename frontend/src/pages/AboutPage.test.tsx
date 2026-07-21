import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AboutPage from "./AboutPage";

// Static page, no fetches -- what needs pinning is the referral contract:
// the whole feature exists to route a reader to the author, so a typo'd
// portfolio URL or a link that navigates the app tab away (no target)
// would defeat it silently while still rendering fine.

function renderAbout() {
  render(
    <MemoryRouter initialEntries={["/about"]}>
      <AboutPage />
    </MemoryRouter>
  );
}

describe("AboutPage", () => {
  it("renders the hero and the author section", () => {
    renderAbout();
    expect(screen.getByRole("heading", { name: "About this project" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Built by Vy Nguyen" })).toBeInTheDocument();
  });

  it("links to the portfolio site in a new tab", () => {
    renderAbout();
    const portfolio = screen.getByRole("link", { name: "Visit my portfolio" });
    expect(portfolio).toHaveAttribute("href", "https://vynguyen-perth.netlify.app");
    expect(portfolio).toHaveAttribute("target", "_blank");
    expect(portfolio).toHaveAttribute("rel", "noreferrer");
  });

  it("links to the repository in a new tab", () => {
    renderAbout();
    const repo = screen.getByRole("link", { name: "Source on GitHub" });
    expect(repo).toHaveAttribute("href", "https://github.com/tonynguyen1292/WA_Mining");
    expect(repo).toHaveAttribute("target", "_blank");
    expect(repo).toHaveAttribute("rel", "noreferrer");
  });

  it("routes back into the app's three main views", () => {
    renderAbout();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sites table" })).toHaveAttribute("href", "/sites");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/map");
  });

  it("shows the same dataset facts the dashboard's provenance strip carries", () => {
    // Both surfaces hardcode the snapshot shape on purpose; the refresh
    // checklist finds them by searching for 421 -- this test pins that
    // the number actually appears, so the checklist's search keeps working.
    renderAbout();
    expect(screen.getByText("421")).toBeInTheDocument();
    expect(screen.getByText("356")).toBeInTheDocument();
  });
});
