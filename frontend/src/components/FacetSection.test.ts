import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import FacetSection from "./FacetSection.svelte";

const rows = Array.from({ length: 27 }, (_, index) => ({
  value: `c${index}`,
  count: 27 - index,
}));

describe("FacetSection", () => {
  it("shows every row when the section is short", () => {
    render(FacetSection, {
      title: "Type",
      rows: rows.slice(0, 3),
      selected: [],
      ontoggle: () => {},
    });
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("caps a long section and says how many are hidden", () => {
    render(FacetSection, {
      title: "Region",
      rows,
      selected: [],
      ontoggle: () => {},
    });
    expect(screen.getAllByRole("checkbox")).toHaveLength(8);
    expect(screen.getByRole("button").textContent).toContain("(19)");
  });

  it("keeps a selected row visible even past the cap", () => {
    // Otherwise applying a filter from the expanded list, then collapsing it,
    // leaves the results filtered by something the sidebar no longer shows.
    render(FacetSection, {
      title: "Region",
      rows,
      selected: ["c20"],
      ontoggle: () => {},
    });
    expect(screen.getAllByRole("checkbox")).toHaveLength(9);
    expect(screen.getByText("c20")).toBeTruthy();
  });

  it("reports the value that was toggled", async () => {
    const ontoggle = vi.fn();
    const { container } = render(FacetSection, {
      title: "Region",
      rows: rows.slice(0, 2),
      selected: [],
      ontoggle,
    });
    const box = container.querySelectorAll<HTMLInputElement>("input")[1];
    box.click();
    expect(ontoggle).toHaveBeenCalledWith("c1");
  });
});

describe("the expansion", () => {
  it("reports outward rather than holding its own flag", () => {
    // A filter click rebuilds the result and remounts every section, so a flag
    // kept in here would be lost on the very click that used it.
    const onexpand = vi.fn();
    render(FacetSection, {
      title: "Region",
      rows,
      selected: [],
      ontoggle: () => {},
      expanded: false,
      onexpand,
    });
    screen.getByRole("button").click();
    expect(onexpand).toHaveBeenCalledWith(true);
  });

  it("shows every row when the caller says it is expanded", () => {
    render(FacetSection, {
      title: "Region",
      rows,
      selected: [],
      ontoggle: () => {},
      expanded: true,
    });
    expect(screen.getAllByRole("checkbox")).toHaveLength(rows.length);
  });
});
