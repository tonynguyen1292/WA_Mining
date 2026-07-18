import { describe, expect, it } from "vitest";
import {
  filtersFromSearchParams,
  pageFromSearchParams,
  sortFromSearchParams,
  writeFiltersToSearchParams,
} from "./urlFilters";

describe("filtersFromSearchParams", () => {
  it("returns an empty object for an empty query string", () => {
    expect(filtersFromSearchParams(new URLSearchParams())).toEqual({});
  });

  it("reads a single-value array filter", () => {
    const params = new URLSearchParams("commodity=Gold");
    expect(filtersFromSearchParams(params)).toEqual({ commodity: ["Gold"] });
  });

  it("reads repeated params as a multi-value array, preserving order", () => {
    const params = new URLSearchParams("commodity=Gold&commodity=Nickel");
    expect(filtersFromSearchParams(params)).toEqual({
      commodity: ["Gold", "Nickel"],
    });
  });

  it("reads the search param", () => {
    const params = new URLSearchParams("search=Beta");
    expect(filtersFromSearchParams(params)).toEqual({ search: "Beta" });
  });

  it("ignores unrelated params like page and sort", () => {
    const params = new URLSearchParams("sort=-stage&page=2&stage=Operating");
    expect(filtersFromSearchParams(params)).toEqual({ stage: ["Operating"] });
  });

  it("combines multiple filter fields", () => {
    const params = new URLSearchParams("stage=Operating&region=Pilbara&search=mine");
    expect(filtersFromSearchParams(params)).toEqual({
      stage: ["Operating"],
      region: ["Pilbara"],
      search: "mine",
    });
  });
});

describe("writeFiltersToSearchParams", () => {
  it("preserves unrelated existing params untouched", () => {
    const params = new URLSearchParams("sort=-stage&page=2");
    const next = writeFiltersToSearchParams(params, { stage: ["Operating"] });
    expect(next.get("sort")).toBe("-stage");
    expect(next.get("page")).toBe("2");
    expect(next.getAll("stage")).toEqual(["Operating"]);
  });

  it("replaces a filter's values rather than appending to existing ones", () => {
    const params = new URLSearchParams("commodity=Gold");
    const next = writeFiltersToSearchParams(params, { commodity: ["Nickel"] });
    expect(next.getAll("commodity")).toEqual(["Nickel"]);
  });

  it("removes a filter key entirely when it's no longer set", () => {
    const params = new URLSearchParams("stage=Operating&region=Pilbara");
    const next = writeFiltersToSearchParams(params, { region: ["Pilbara"] });
    expect(next.has("stage")).toBe(false);
    expect(next.getAll("region")).toEqual(["Pilbara"]);
  });

  it("sets the search param when present", () => {
    const next = writeFiltersToSearchParams(new URLSearchParams(), { search: "Beta" });
    expect(next.get("search")).toBe("Beta");
  });

  it("removes the search param when absent or empty", () => {
    const params = new URLSearchParams("search=Beta");
    const next = writeFiltersToSearchParams(params, {});
    expect(next.has("search")).toBe(false);
  });

  it("round-trips through filtersFromSearchParams unchanged", () => {
    const original = { commodity: ["Gold", "Nickel"], stage: ["Operating"], search: "mine" };
    const written = writeFiltersToSearchParams(new URLSearchParams(), original);
    expect(filtersFromSearchParams(written)).toEqual(original);
  });
});

describe("pageFromSearchParams", () => {
  it("defaults to 1 when page is missing", () => {
    expect(pageFromSearchParams(new URLSearchParams())).toBe(1);
  });

  it("parses a valid page number", () => {
    expect(pageFromSearchParams(new URLSearchParams("page=3"))).toBe(3);
  });

  it("falls back to 1 for a non-numeric value", () => {
    expect(pageFromSearchParams(new URLSearchParams("page=abc"))).toBe(1);
  });

  it("falls back to 1 for zero or negative values", () => {
    expect(pageFromSearchParams(new URLSearchParams("page=0"))).toBe(1);
    expect(pageFromSearchParams(new URLSearchParams("page=-5"))).toBe(1);
  });

  it("truncates a decimal string rather than rejecting it", () => {
    // documents actual parseInt behavior -- "2.7" -> 2, not a fallback to 1
    expect(pageFromSearchParams(new URLSearchParams("page=2.7"))).toBe(2);
  });
});

describe("sortFromSearchParams", () => {
  it("returns undefined when sort is missing", () => {
    expect(sortFromSearchParams(new URLSearchParams())).toBeUndefined();
  });

  it("returns the sort value verbatim, including the descending prefix", () => {
    expect(sortFromSearchParams(new URLSearchParams("sort=-stage"))).toBe("-stage");
  });
});
