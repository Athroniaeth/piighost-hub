import { describe, expect, it } from "vitest";
import {
  emptyGroupDraft,
  groupDraftFrom,
  groupProblems,
  groupStarted,
  toGroupManifest,
  type GroupDraft,
} from "./group-draft";

function draft(overrides: Partial<GroupDraft> = {}): GroupDraft {
  return {
    name: "logs",
    tags: ["international", "network"],
    en: "What a server log carries.",
    fr: "Ce que porte un log serveur.",
    sources: [
      { ref: "piighost/secrets", exclude: [] },
      { ref: "piighost/generic", exclude: ["URL"] },
    ],
    ...overrides,
  };
}

describe("groupProblems", () => {
  it("accepts a complete draft", () => {
    expect(groupProblems(draft())).toEqual([]);
  });

  it("needs at least one source", () => {
    const found = groupProblems(draft({ sources: [{ ref: "", exclude: [] }] }));
    expect(found.map((p) => p.message)).toContain("sources.one");
  });

  it("refuses the same source twice", () => {
    // Two entries for one reference is a diamond the resolver de-duplicates,
    // so the second one only ever adds confusion about which exclusion applies.
    const found = groupProblems(
      draft({
        sources: [
          { ref: "piighost/generic", exclude: [] },
          { ref: "piighost/generic", exclude: ["URL"] },
        ],
      }),
    );
    expect(found.map((p) => p.message)).toContain("sources.twice");
  });

  it("names which description is missing", () => {
    expect(groupProblems(draft({ fr: "" })).map((p) => p.message)).toEqual([
      "description.empty.fr",
    ]);
  });
});

describe("groupStarted", () => {
  it("says no on an untouched form and yes on the first choice", () => {
    expect(groupStarted(emptyGroupDraft())).toBe(false);
    expect(
      groupStarted({
        ...emptyGroupDraft(),
        sources: [{ ref: "piighost/email", exclude: [] }],
      }),
    ).toBe(true);
  });
});

describe("toGroupManifest", () => {
  it("writes the sources in order, with their exclusions", () => {
    const out = toGroupManifest(draft());
    expect(out).toContain('name = "logs"');
    expect(out).toContain('tags = ["international", "network"]');
    expect(out.indexOf("piighost/secrets")).toBeLessThan(
      out.indexOf("piighost/generic"),
    );
    expect(out).toContain('ref = "piighost/generic"\nexclude = ["URL"]');
  });

  it("leaves out the exclude key when nothing is excluded", () => {
    const out = toGroupManifest(
      draft({ sources: [{ ref: "piighost/email", exclude: [] }] }),
    );
    expect(out).not.toContain("exclude");
  });

  it("escapes a quote in a description", () => {
    const out = toGroupManifest(draft({ en: 'The "logs" group.' }));
    expect(out).toContain('en = "The \\"logs\\" group."');
  });

  it("drops the rows left empty", () => {
    const out = toGroupManifest(
      draft({ sources: [...draft().sources, { ref: "", exclude: [] }] }),
    );
    expect(out.match(/\[\[sources\]\]/g)).toHaveLength(2);
  });
});

describe("groupDraftFrom", () => {
  const commit = {
    key: "piighost/logs",
    kind: "group" as const,
    commit: "aaaaaaaa",
    digest: "aaaaaaaa",
    recorded_at: null,
    content: {
      name: "logs",
      tags: ["international", "network"],
      description: { en: "Logs.", fr: "Journaux." },
      sources: [
        { ref: "piighost/network:1234abcd", exclude: [] },
        { ref: "piighost/generic:5678efab", exclude: ["URL"] },
      ],
    },
  };

  it("carries the sources across in order, with their exclusions", () => {
    const out = groupDraftFrom(commit);
    expect(out.name).toBe("logs");
    expect(out.sources.map((s) => s.ref)).toEqual([
      "piighost/network",
      "piighost/generic",
    ]);
    expect(out.sources[1].exclude).toEqual(["URL"]);
  });

  it("drops the pin, so a fork follows its parents rather than freezing them", () => {
    // The stored manifest pins every reference to the commit it resolved to.
    // Inheriting that would give a fork parents that never improve again.
    expect(groupDraftFrom(commit).sources[0].ref).not.toContain(":");
  });

  it("round-trips into a manifest with no problems left", () => {
    expect(groupProblems(groupDraftFrom(commit))).toEqual([]);
    expect(toGroupManifest(groupDraftFrom(commit))).toContain(
      'ref = "piighost/network"',
    );
  });
});
