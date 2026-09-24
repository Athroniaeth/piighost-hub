import { describe, expect, it } from "vitest";
import {
  draftFrom,
  emptyDraft,
  labelOf,
  problems,
  started,
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
    const found = problems(draft({ en: "" }));
    expect(found.map((p) => p.message)).toEqual(["description.empty"]);
  });

  it("refuses an em-dash in a description", () => {
    const found = problems(draft({ en: "An order \u2014 internal." }));
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

describe("started", () => {
  it("says no on a form nobody has touched", () => {
    expect(started(emptyDraft())).toBe(false);
  });

  it("says yes on the first thing typed, wherever it was typed", () => {
    expect(started({ ...emptyDraft(), regex: "\\d" })).toBe(true);
    expect(started({ ...emptyDraft(), tags: ["contact"] })).toBe(true);
    expect(
      started({
        ...emptyDraft(),
        noMatches: [{ text: "not an email" }, { text: "" }],
      }),
    ).toBe(true);
    expect(
      started({
        ...emptyDraft(),
        redos: { prefix: "", filler: "a.", suffix: "" },
      }),
    ).toBe(true);
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

describe("draftFrom", () => {
  const commit = {
    key: "piighost/fr-nir",
    kind: "pattern" as const,
    commit: "0b19f679",
    digest: "0b19f679…",
    recorded_at: "2026-09-13T04:37:47+00:00",
    content: {
      kind: "pattern",
      namespace: "piighost",
      name: "fr-nir",
      schema_version: 1,
      label: "FR_NIR",
      regex: "\\b[12]\\d{14}\\b",
      description: { en: "French NIR." },
      tags: ["fr", "government-id", "health"],
      resilience: true,
      examples: {
        match: [
          { text: "NIR : 180057505600157", value: "180057505600157" },
          { text: "Assuré 280057505600157", value: "280057505600157" },
        ],
        no_match: [{ text: "SIRET 73282932000074" }, { text: "1234" }],
      },
      redos: { prefix: "1", filler: "8", suffix: "x" },
    },
  };

  it("carries every field across, examples included", () => {
    const out = draftFrom(commit);
    expect(out.name).toBe("fr-nir");
    expect(out.label).toBe("FR_NIR");
    expect(out.tags).toEqual(["fr", "government-id", "health"]);
    expect(out.regex).toBe("\\b[12]\\d{14}\\b");
    expect(out.en).toBe("French NIR.");
    expect(out.matches).toHaveLength(2);
    expect(out.matches[0].value).toBe("180057505600157");
    expect(out.noMatches[1].text).toBe("1234");
    expect(out.redos).toEqual({ prefix: "1", filler: "8", suffix: "x" });
  });

  it("keeps a label the name would not have produced", () => {
    // it-tessera-sanitaria emits IT_HEALTH_CARD. Deriving from the name would
    // silently rename the label of every fork.
    const out = draftFrom({
      ...commit,
      content: {
        ...commit.content,
        name: "it-tessera-sanitaria",
        label: "IT_HEALTH_CARD",
      },
    });
    expect(out.label).toBe("IT_HEALTH_CARD");
  });

  it("pads up to the two rows the registry asks for", () => {
    const out = draftFrom({
      ...commit,
      content: {
        ...commit.content,
        examples: { match: [{ text: "a 1", value: "1" }], no_match: [] },
      },
    });
    expect(out.matches).toHaveLength(2);
    expect(out.matches[1]).toEqual({ text: "", value: "" });
    expect(out.noMatches).toHaveLength(2);
  });

  it("round-trips through the manifest it writes", () => {
    const out = toManifest(draftFrom(commit));
    expect(out).toContain('name = "fr-nir"');
    expect(out).toContain("regex = '\\b[12]\\d{14}\\b'");
    expect(out.match(/\[\[examples\.match\]\]/g)).toHaveLength(2);
    expect(problems(draftFrom(commit))).toEqual([]);
  });
});
