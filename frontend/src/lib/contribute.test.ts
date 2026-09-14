import { describe, expect, it } from "vitest";
import type { ManifestOut } from "../generated/api";
import { basedOn, blank, labelOf } from "./contribute";

const CONFIG: ManifestOut = {
  key: "piighost/fr-default",
  kind: "config",
  path: "configs/piighost/fr-default/config.toml",
  text: 'schema_version = 1\n\n[config]\nname = "fr-default"\n',
};

const PATTERN: ManifestOut = {
  key: "piighost/email",
  kind: "pattern",
  path: "patterns/piighost/email/pattern.toml",
  text: [
    "schema_version = 1",
    "",
    "[pattern]",
    'name = "email"',
    'label = "EMAIL"',
    "regex = '[a-z]+@[a-z]+'",
    "",
    "[pattern.description]",
    'en = "An address. The name = \\"x\\" inside a string must survive."',
  ].join("\n"),
};

describe("labelOf", () => {
  it("turns a kebab-case name into the upper snake label convention", () => {
    expect(labelOf("order-id")).toBe("ORDER_ID");
  });

  it("falls back rather than emitting an empty label", () => {
    expect(labelOf("")).toBe("MY_LABEL");
  });
});

describe("blank", () => {
  it("names the manifest after what the contributor typed", () => {
    expect(blank("pattern", "order-id")).toContain('name = "order-id"');
    expect(blank("pattern", "order-id")).toContain('label = "ORDER_ID"');
  });

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

  it("copies a pattern, since changing a shape means editing the regex", () => {
    const out = basedOn("pattern", "alice-email", PATTERN);
    expect(out).toContain('name = "alice-email"');
    expect(out).toContain('label = "ALICE_EMAIL"');
    expect(out).toContain("regex = '[a-z]+@[a-z]+'");
  });

  it("renames only the assignment at the start of a line", () => {
    // `name = "x"` also appears inside the description string, and rewriting it
    // there would corrupt the copy in a way the check reports as a TOML error.
    const out = basedOn("pattern", "alice-email", PATTERN);
    expect(out).toContain('The name = \\"x\\" inside a string must survive.');
  });
});
