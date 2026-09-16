import { describe, expect, it } from "vitest";
import type { CommitDetail } from "../generated/api";
import {
  configDraftFrom,
  configProblems,
  configStarted,
  emptyConfigDraft,
  toConfigManifest,
  unsupported,
  type ConfigDraft,
} from "./config-draft";

function draft(overrides: Partial<ConfigDraft> = {}): ConfigDraft {
  return {
    ...emptyConfigDraft(),
    name: "fr-support",
    tags: ["fr", "chat"],
    en: "France for a support desk.",
    fr: "France pour un support client.",
    detectors: [
      { name: "regex-fr", groups: ["piighost/fr", "piighost/generic"] },
    ],
    ...overrides,
  };
}

function commit(content: Record<string, unknown>): CommitDetail {
  return {
    key: "piighost/x",
    kind: "config",
    commit: "aaaaaaaa",
    digest: "aaaaaaaa",
    recorded_at: null,
    content,
  };
}

describe("configProblems", () => {
  it("accepts a configuration that declares detectors", () => {
    expect(configProblems(draft())).toEqual([]);
  });

  it("accepts one that only inherits", () => {
    expect(
      configProblems(
        draft({
          detectors: [],
          extends: [{ ref: "piighost/fr-default", exclude: [] }],
        }),
      ),
    ).toEqual([]);
  });

  it("refuses one that neither inherits nor declares", () => {
    // It would render an empty pipeline, which piighost rejects.
    const found = configProblems(draft({ detectors: [], extends: [] }));
    expect(found.map((p) => p.message)).toContain("detectors.one");
  });

  it("refuses a detector with no group", () => {
    const found = configProblems(
      draft({ detectors: [{ name: "regex-fr", groups: [] }] }),
    );
    expect(found.map((p) => p.message)).toContain("detector.empty");
  });

  it("refuses two detectors sharing a name", () => {
    const found = configProblems(
      draft({
        detectors: [
          { name: "regex", groups: ["piighost/fr"] },
          { name: "regex", groups: ["piighost/eu"] },
        ],
      }),
    );
    expect(found.map((p) => p.message)).toContain("detector.twice");
  });
});

describe("configStarted", () => {
  it("is quiet on a form nobody has touched", () => {
    expect(configStarted(emptyConfigDraft())).toBe(false);
  });

  it("wakes on the first group chosen", () => {
    expect(
      configStarted({
        ...emptyConfigDraft(),
        detectors: [{ name: "", groups: ["piighost/fr"] }],
      }),
    ).toBe(true);
  });
});

describe("toConfigManifest", () => {
  it("writes the shape the registry reads", () => {
    const out = toConfigManifest(draft());
    expect(out).toContain('name = "fr-support"');
    expect(out).toContain('piighost = ">=1.7,<2"');
    expect(out).toContain(
      '[[detectors]]\nname = "regex-fr"\ntype = "regex"\ngroups = ["piighost/fr", "piighost/generic"]',
    );
    expect(out).toContain('[stages.linker]\ntype = "exact"');
    expect(out).toContain(
      '[stages.anonymizer.placeholder]\ntype = "label_counter"',
    );
  });

  it("writes the exclusions of a parent, prefixed as the registry wants", () => {
    const out = toConfigManifest(
      draft({
        extends: [
          {
            ref: "piighost/regex-default",
            exclude: ["detector:regex-us", "label:IBAN"],
          },
        ],
      }),
    );
    expect(out).toContain('[[extends]]\nref = "piighost/regex-default"');
    expect(out).toContain('exclude = ["detector:regex-us", "label:IBAN"]');
  });

  it("leaves a stage out rather than writing an empty one", () => {
    const out = toConfigManifest(
      draft({
        stages: { linker: "exact", expander: "", placeholder: "label_counter" },
      }),
    );
    expect(out).not.toContain("[stages.expander]");
    expect(out).toContain("[stages.linker]");
  });
});

describe("unsupported", () => {
  const regular = {
    name: "fr-default",
    detectors: [{ name: "regex-fr", type: "regex", groups: ["piighost/fr"] }],
    stages: {
      linker: { type: "exact" },
      expander: { type: "word_boundary" },
      anonymizer: { placeholder: { type: "label_counter" } },
    },
  };

  it("says nothing about the shape thirty of thirty-two configurations use", () => {
    expect(unsupported(commit(regular))).toEqual([]);
  });

  it("names a detector the form has no field for", () => {
    // ner-base carries a model and a threshold; a form that dropped them would
    // hand back a manifest missing a piece its author never removed.
    const reasons = unsupported(
      commit({
        ...regular,
        detectors: [
          { name: "ner", type: "gliner2", model: "m", threshold: 0.5 },
        ],
      }),
    );
    expect(reasons).toEqual(["detector ner (gliner2)"]);
  });

  it("names a stage the form has no field for", () => {
    const reasons = unsupported(
      commit({
        ...regular,
        stages: { ...regular.stages, guard: { type: "detector" } },
      }),
    );
    expect(reasons).toEqual(["stage guard"]);
  });

  it("names a known stage set to an option the form cannot offer", () => {
    const reasons = unsupported(
      commit({
        ...regular,
        stages: { ...regular.stages, expander: { type: "sentence" } },
      }),
    );
    expect(reasons).toEqual(["stage expander (sentence)"]);
  });
});

describe("configDraftFrom", () => {
  it("carries every field the form owns", () => {
    const out = configDraftFrom(
      commit({
        name: "fr-default",
        tags: ["fr", "chat"],
        description: { en: "France.", fr: "France." },
        piighost: ">=1.7,<2",
        extends: [
          { ref: "piighost/regex-default:3fa9c2e1", exclude: ["label:IBAN"] },
        ],
        detectors: [
          {
            name: "regex-fr",
            type: "regex",
            groups: [{ ref: "piighost/fr:aabbccdd" }],
          },
        ],
        stages: {
          linker: { type: "exact" },
          anonymizer: { placeholder: { type: "label_counter" } },
        },
      }),
    );
    expect(out.name).toBe("fr-default");
    expect(out.piighost).toBe(">=1.7,<2");
    // The pin is dropped on the way in, deliberately: a fork that froze its
    // parents would never see them improve.
    expect(out.extends).toEqual([
      { ref: "piighost/regex-default", exclude: ["label:IBAN"] },
    ]);
    expect(out.detectors).toEqual([
      { name: "regex-fr", groups: ["piighost/fr"] },
    ]);
    expect(out.stages).toEqual({
      linker: "exact",
      expander: "",
      placeholder: "label_counter",
    });
  });

  it("round-trips through the manifest it writes", () => {
    const out = toConfigManifest(
      configDraftFrom(
        commit({
          name: "fr-default",
          tags: ["fr"],
          description: { en: "a", fr: "b" },
          piighost: ">=1.7,<2",
          detectors: [
            { name: "regex-fr", type: "regex", groups: ["piighost/fr"] },
          ],
          stages: { linker: { type: "exact" } },
        }),
      ),
    );
    expect(out).toContain('name = "fr-default"');
    expect(out).toContain('groups = ["piighost/fr"]');
  });
});
