import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import PatternExamples from "./PatternExamples.svelte";
import { emptyDraft, type PatternDraft } from "../lib/pattern-draft";

// A rune file: the component mutates the draft it is handed, and a plain
// object is not reactive, so the rows would never redraw here even though
// they do in the page, where the state comes from `$state`.
function reactive(seed: PatternDraft = emptyDraft()): PatternDraft {
  const draft = $state(seed);
  return draft;
}

// The verdict calls the API on a timer; the rows themselves are what is tested.
vi.mock("../lib/api", () => ({
  ApiError: class extends Error {},
  api: { candidate: () => new Promise(() => {}) },
}));

describe("PatternExamples", () => {
  it("opens on two rows of each kind, which is what the registry requires", () => {
    render(PatternExamples, { draft: reactive() });
    expect(screen.getAllByLabelText("A sentence")).toHaveLength(4);
    expect(screen.getAllByLabelText("The value in it")).toHaveLength(2);
  });

  it("adds a row where it was asked, not at the other list", async () => {
    render(PatternExamples, { draft: reactive() });
    const buttons = screen.getAllByRole("button", { name: /Add a row/ });
    buttons[0].click();
    await tick();
    expect(screen.getAllByLabelText("The value in it")).toHaveLength(3);
    expect(screen.getAllByLabelText("A sentence")).toHaveLength(5);
  });

  it("removes the row that was clicked", async () => {
    const draft = reactive({
      ...emptyDraft(),
      matches: [
        { text: "first", value: "a" },
        { text: "second", value: "b" },
      ],
    });
    render(PatternExamples, { draft });
    const remove = screen.getAllByRole("button", { name: "Remove" });
    remove[0].click();
    await tick();
    const values = screen.getAllByLabelText(
      "The value in it",
    ) as HTMLInputElement[];
    expect(values.map((input) => input.value)).toEqual(["b"]);
  });

  it("carries the backtracking recipe", () => {
    render(PatternExamples, { draft: reactive() });
    for (const field of ["Prefix", "Filler", "Suffix"]) {
      expect(screen.getByLabelText(field)).toBeTruthy();
    }
  });
});

describe("the sections", () => {
  it("separates what must be caught from what must be left alone", () => {
    const { container } = render(PatternExamples, { draft: reactive() });
    const headings = [...container.querySelectorAll("h3")].map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual([
      "Must be caught",
      "Must be left alone",
      "Backtracking recipe",
    ]);
  });
});
