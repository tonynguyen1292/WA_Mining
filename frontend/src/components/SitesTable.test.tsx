import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Site } from "../types/site";
import SitesTable from "./SitesTable";

// SitesTable renders <Link> internally, which needs a Router in context.
function renderTable(props: Partial<React.ComponentProps<typeof SitesTable>> = {}) {
  const onSortChange = vi.fn();
  const onPageChange = vi.fn();
  render(
    <MemoryRouter>
      <SitesTable
        items={SAMPLE_ITEMS}
        total={SAMPLE_ITEMS.length}
        page={1}
        pageSize={25}
        onPageChange={onPageChange}
        onSortChange={onSortChange}
        {...props}
      />
    </MemoryRouter>
  );
  return { onSortChange, onPageChange };
}

const SAMPLE_ITEMS: Site[] = [
  {
    site_code: "S001",
    project_code: null,
    project_title: "Alpha Project",
    title: "Alpha Mine",
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
  },
];

describe("SitesTable sort headers", () => {
  it("shows no direction indicator when no column is active", () => {
    renderTable({ sort: undefined });
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });

  it("clicking an inactive column sorts it ascending", async () => {
    const { onSortChange } = renderTable({ sort: undefined });
    await userEvent.click(screen.getByRole("button", { name: /^Stage/ }));
    expect(onSortChange).toHaveBeenCalledWith("stage");
  });

  it("clicking the active ascending column flips it to descending", async () => {
    const { onSortChange } = renderTable({ sort: "stage" });
    expect(screen.getByRole("button", { name: /^Stage▲/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Stage/ }));
    expect(onSortChange).toHaveBeenCalledWith("-stage");
  });

  it("clicking the active descending column cycles back to ascending", async () => {
    const { onSortChange } = renderTable({ sort: "-stage" });
    expect(screen.getByRole("button", { name: /^Stage▼/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Stage/ }));
    expect(onSortChange).toHaveBeenCalledWith("stage");
  });

  it("clicking a different column starts it ascending, not carrying over direction", async () => {
    const { onSortChange } = renderTable({ sort: "stage" });
    await userEvent.click(screen.getByRole("button", { name: /^Region/ }));
    expect(onSortChange).toHaveBeenCalledWith("development_region");
  });
});
