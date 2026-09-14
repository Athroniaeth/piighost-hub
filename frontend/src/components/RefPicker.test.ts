import { render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RefPicker from "./RefPicker.svelte";

const items = [
  {
    key: "piighost/email",
    kind: "pattern",
    labels: ["EMAIL"],
    tags: ["contact"],
  },
  {
    key: "piighost/dev-secrets",
    kind: "config",
    labels: Array.from({ length: 21 }, (_, i) => `L${i}`),
    tags: ["secrets"],
  },
  {
    key: "piighost/generic",
    kind: "group",
    labels: ["EMAIL", "URL", "IPV4"],
    tags: ["international"],
  },
].map((item) => ({
  ...item,
  namespace: "piighost",
  name: item.key.split("/")[1],
  description: { en: "", fr: "" },
  commit: "aaaaaaaa",
  commits: 1,
  updated_at: null,
  used_by: [],
}));

vi.mock("../lib/api", () => ({
  api: {
    search: () => Promise.resolve({ items, facets: [], total: items.length }),
  },
}));

async function open() {
  render(RefPicker, {
    value: "piighost/dev-secrets",
    id: "pick",
    label: "Object",
  });
  await screen.findByRole("button", { name: "Object" });
  (await screen.findByRole("button", { name: "Object" })).click();
  return screen.findByRole("listbox");
}

describe("RefPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leads with the configurations, then groups, then patterns", async () => {
    const list = await open();
    const keys = within(list)
      .getAllByRole("option")
      .map((option) => option.textContent?.trim().split(/\s+/)[0]);
    expect(keys).toEqual([
      "piighost/dev-secrets",
      "piighost/generic",
      "piighost/email",
    ]);
  });

  it("shows the coverage count on every row", async () => {
    // It was there in the DOM and painted away by an ancestor's overflow, so
    // this asserts the text exists and the layout comment guards the rest.
    const list = await open();
    for (const option of within(list).getAllByRole("option")) {
      expect(option.textContent).toMatch(/\d+$/);
    }
    expect(within(list).getByText("21")).toBeTruthy();
  });

  it("names the kind and the coverage in the title, with the whole key", async () => {
    const list = await open();
    const [first] = within(list).getAllByRole("option");
    expect(first.getAttribute("title")).toContain("piighost/dev-secrets");
    expect(first.getAttribute("title")).toContain("21");
  });

  it("filters on the key, the tags and the labels", async () => {
    const list = await open();
    const field = screen.getByPlaceholderText(/Filter/);
    (field as HTMLInputElement).value = "secrets";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(within(list).getAllByRole("option")).toHaveLength(1);
  });
});
