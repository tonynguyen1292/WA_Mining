import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Site } from "../types/site";
import CommandPalette from "./CommandPalette";

// Component contract under test: mounted = open (the parent conditionally
// renders it), so every test starts from a fresh mount with a blank query.

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => mockNavigate,
}));

function makeSite(code: string, title: string): Site {
  return {
    site_code: code,
    project_code: null,
    project_title: `${title} Project`,
    title,
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
    active_flag: null,
  };
}

function stubFetchReturning(items: Site[]) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items, total: items.length, page: 1, page_size: 8 }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPalette() {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <CommandPalette onClose={onClose} />
    </MemoryRouter>
  );
  return { onClose };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("CommandPalette", () => {
  it("starts with a focused, blank input and the empty prompt -- no fetch fired", () => {
    const fetchMock = stubFetchReturning([]);
    renderPalette();

    expect(screen.getByPlaceholderText(/search sites/i)).toHaveFocus();
    expect(screen.getByText("Type to search all sites.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces typing into one search request and renders the results", async () => {
    const fetchMock = stubFetchReturning([makeSite("S001", "Alpha Mine"), makeSite("S002", "Beta Mine")]);
    renderPalette();

    await userEvent.keyboard("Gold");

    expect(await screen.findByText("Alpha Mine")).toBeInTheDocument();
    expect(screen.getByText("Beta Mine")).toBeInTheDocument();
    // 4 keystrokes inside the 150ms debounce window collapse to one request,
    // for the final query text.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("search=Gold");
  });

  it("navigates to the ArrowDown-selected result on Enter and closes", async () => {
    stubFetchReturning([makeSite("S001", "Alpha Mine"), makeSite("S002", "Beta Mine")]);
    const { onClose } = renderPalette();

    await userEvent.keyboard("mine");
    await screen.findByText("Alpha Mine");

    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(mockNavigate).toHaveBeenCalledWith("/sites/S002");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    stubFetchReturning([]);
    const { onClose } = renderPalette();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the no-matches message for a query with zero results", async () => {
    stubFetchReturning([]);
    renderPalette();

    await userEvent.keyboard("zzz");
    expect(await screen.findByText('No sites match "zzz".')).toBeInTheDocument();
  });

  it("shows an inline error and logs a tagged console.error when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPalette();

    await userEvent.keyboard("Gold");

    await waitFor(() =>
      expect(screen.getByText("Couldn't load results. Is the API running?")).toBeInTheDocument()
    );
    expect(consoleError).toHaveBeenCalledWith("[CommandPalette] search failed:", expect.any(Error));
    consoleError.mockRestore();
  });
});
