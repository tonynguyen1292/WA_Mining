import { describe, expect, it } from "vitest";
import { buildSitesExportUrl } from "./client";

// Asserts on pathname + query params, not the origin -- API_BASE_URL
// resolves differently per environment (dev fallback vs build-time env),
// and pinning it here would make the test fail for reasons the export
// logic doesn't own.

describe("buildSitesExportUrl", () => {
  it("targets the export endpoint with no params for an empty filter set", () => {
    const url = new URL(buildSitesExportUrl({}));
    expect(url.pathname).toBe("/api/sites/export");
    expect([...url.searchParams.keys()]).toEqual([]);
  });

  it("serializes multi-value filters as repeated params, matching the table's fetch", () => {
    const url = new URL(
      buildSitesExportUrl({ commodity: ["Gold", "Nickel"], stage: ["Operating"] })
    );
    expect(url.searchParams.getAll("commodity")).toEqual(["Gold", "Nickel"]);
    expect(url.searchParams.getAll("stage")).toEqual(["Operating"]);
  });

  it("includes search and sort when set", () => {
    const url = new URL(buildSitesExportUrl({ search: "mine" }, "-stage"));
    expect(url.searchParams.get("search")).toBe("mine");
    expect(url.searchParams.get("sort")).toBe("-stage");
  });

  it("omits sort when undefined and never sends pagination params", () => {
    const url = new URL(buildSitesExportUrl({ region: ["Pilbara"] }));
    expect(url.searchParams.has("sort")).toBe(false);
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("page_size")).toBe(false);
  });
});
