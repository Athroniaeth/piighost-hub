import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  labelOf,
  problems,
  toManifest,
  type PatternDraft,
} from "./pattern-draft";

function draft(overrides: Partial<PatternDraft> = {}): PatternDraft {
  return {
    ...emptyDraft(),
    name: "order-id",
    label: "ORDER_ID",
    tags: ["international", "business"],
    regex: "\\bORD-[0-9]{6}\\b",
    en: "Internal order identifier.",
    fr: "Identifiant de commande interne.",
    matches: [
      { text: "Order ORD-123456 shipped.", value: "ORD-123456" },
      { text: "Cancel ORD-987654 please.", value: "ORD-987654" },
    ],
    noMatches: [{ text: "ORD-12" }, { text: "ORD-1234567" }],
    redos: { prefix: "ORD-", filler: "0", suffix: "x" },
    ...overrides,
  };
}

describe("labelOf", () => {
  it("follows the upper snake convention", () => {
    expect(labelOf("fr-nir")).toBe("FR_NIR");
  });
});

describe("problems", () => {
  it("accepts a complete draft", () => {
    expect(problems(draft())).toEqual([]);
  });

  it("insists on kebab-case and upper snake", () => {
    const found = problems(draft({ name: "Order ID", label: "order_id" }));
    expect(found.map((p) => p.message)).toContain("name.kebab");
    expect(found.map((p) => p.message)).toContain("label.snake");
  });

  it("refuses a regex holding the quote that closes a TOML literal", () => {
    // The manifest would stop parsing mid-regex, and the error would name the
    // line after it, which is the hardest kind of mistake to find by reading.
    const found = problems(draft({ regex: "it's" }));
    expect(found.map((p) => p.message)).toContain("regex.quote");
  });

  it("names which description is missing, rather than saying both", () => {
    const found = problems(draft({ fr: "" }));
    expect(found.map((p) => p.message)).toEqual(["description.empty.fr"]);
  });

  it("refuses an em-dash in a description", () => {
    const found = problems(draft({ en: "An order — internal." }));
    expect(found.map((p) => p.message)).toContain("description.dash");
  });

  it("requires the value to appear exactly once in its sentence", () => {
    const found = problems(
      draft({
        matches: [
          { text: "ORD-123456 and ORD-123456", value: "ORD-123456" },
          { text: "Cancel ORD-987654.", value: "ORD-987654" },
        ],
      }),
    );
    expect(found.map((p) => p.message)).toContain("match.once");
  });

  it("requires two examples of each kind", () => {
    const found = problems(
      draft({
        matches: [{ text: "Order ORD-123456.", value: "ORD-123456" }],
        noMatches: [{ text: "ORD-12" }],
      }),
    );
    expect(found.map((p) => p.message)).toContain("matches.two");
    expect(found.map((p) => p.message)).toContain("noMatches.two");
  });

  it("ignores rows left blank rather than counting them", () => {
    expect(
      problems(draft({ noMatches: [...draft().noMatches, { text: "" }] })),
    ).toEqual([]);
  });
});

describe("toManifest", () => {
  it("writes a manifest the registry importer would accept", () => {
    const out = toManifest(draft());
    expect(out).toContain('name = "order-id"');
    expect(out).toContain('label = "ORDER_ID"');
    expect(out).toContain('tags = ["international", "business"]');
    expect(out).toContain("regex = '\\bORD-[0-9]{6}\\b'");
    expect(out.match(/\[\[examples\.match\]\]/g)).toHaveLength(2);
    expect(out.match(/\[\[examples\.no_match\]\]/g)).toHaveLength(2);
    expect(out).toContain('prefix = "ORD-"');
  });

  it("keeps the regex in a literal string, so a backslash stays single", () => {
    // A basic string would need every backslash doubled, and a contributor who
    // pasted a working regex would get a manifest that no longer matches.
    const out = toManifest(draft({ regex: "(?<!\\w)\\d{3}-\\d{4}(?!\\w)" }));
    expect(out).toContain("regex = '(?<!\\w)\\d{3}-\\d{4}(?!\\w)'");
  });

  it("escapes a quote and a backslash inside a description or an example", () => {
    const out = toManifest(
      draft({
        en: 'The "order" number.',
        matches: [
          { text: 'Path C:\\tmp and "ORD-123456".', value: "ORD-123456" },
          { text: "Cancel ORD-987654.", value: "ORD-987654" },
        ],
      }),
    );
    expect(out).toContain('en = "The \\"order\\" number."');
    expect(out).toContain('text = "Path C:\\\\tmp and \\"ORD-123456\\"."');
  });

  it("leaves out the rows a contributor did not fill", () => {
    const out = toManifest(
      draft({ matches: [...draft().matches, { text: "", value: "" }] }),
    );
    expect(out.match(/\[\[examples\.match\]\]/g)).toHaveLength(2);
  });
});
