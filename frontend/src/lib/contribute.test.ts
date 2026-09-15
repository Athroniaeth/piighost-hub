import { describe, expect, it } from "vitest";
import type { ManifestOut } from "../generated/api";
import { basedOn, blank } from "./contribute";

const CONFIG: ManifestOut = {
  key: "piighost/fr-default",
  kind: "config",
  path: "configs/piighost/fr-default/config.toml",
  text: 'schema_version = 1\n\n[config]\nname = "fr-default"\n',
};

describe("blank", () => {
  it("gives a kind-appropriate skeleton", () => {
    expect(blank("group", "mine")).toContain("[[sources]]");
    expect(blank("config", "mine")).toContain("[[detectors]]");
    expect(blank("config", "mine")).toContain("piighost = ");
  });

  it("stands in a name when the field is still empty", () => {
    expect(blank("config", "")).toContain('name = "my-config"');
  });
});

describe("basedOn", () => {
  it("extends a configuration instead of copying it", () => {
    const out = basedOn("config", "alice-support", CONFIG);
    expect(out).toContain('name = "alice-support"');
    expect(out).toContain('[[extends]]\nref = "piighost/fr-default"');
    // A copy would drag the base's detectors along and then drift from them.
    expect(out).not.toContain("[[detectors]]");
  });

  it("includes a group as a source instead of copying it", () => {
    const out = basedOn("group", "mine", {
      ...CONFIG,
      key: "piighost/generic",
      kind: "group",
    });
    expect(out).toContain('[[sources]]\nref = "piighost/generic"');
  });
});
