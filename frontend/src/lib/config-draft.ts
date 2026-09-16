/**
 * A configuration, as a form rather than as TOML.
 *
 * A configuration is a piighost pipeline without its deployment sections, and
 * the registry's thirty-two of them say the same thing thirty times: inherit or
 * declare a few regex detectors over groups, then the three standard stages.
 * That shape is what this form covers.
 *
 * The rest is not covered, and is refused rather than approximated. A detector
 * with a model carries a threshold, a guard carries a table of values; a form
 * that quietly dropped either on the way in would hand back a manifest missing
 * a piece its author never chose to remove. `unsupported()` is what says so, and
 * the page falls back to the editor with the reason on screen.
 */

import type { CommitDetail } from "../generated/api";

/** `detector:name`, `label:LABEL` or `stage:section`, as the registry writes it. */
export type Exclusion = string;

export type Extend = { ref: string; exclude: Exclusion[] };
export type Detector = { name: string; groups: string[] };

/** The three stages every configuration but one declares, and their options. */
export const STAGES = {
  linker: ["", "exact"],
  expander: ["", "word_boundary"],
  placeholder: ["", "label_counter"],
} as const;

export type Stages = { linker: string; expander: string; placeholder: string };

export type ConfigDraft = {
  name: string;
  tags: string[];
  en: string;
  fr: string;
  piighost: string;
  extends: Extend[];
  detectors: Detector[];
  stages: Stages;
};

export const CONFIG_PLACEHOLDER = {
  name: "fr-default",
  piighost: ">=1.7,<2",
  en: "France without a model: phone, IBAN, social security number and company registration number, plus the shapes that belong to no country.",
  fr: "France sans modèle : téléphone, IBAN, numéro de sécurité sociale et numéro d'entreprise, plus les formes qui n'appartiennent à aucun pays.",
  detector: "regex-fr",
} as const;

export function emptyConfigDraft(): ConfigDraft {
  return {
    name: "",
    tags: [],
    en: "",
    fr: "",
    piighost: ">=1.7,<2",
    extends: [],
    detectors: [{ name: "", groups: [] }],
    stages: {
      linker: "exact",
      expander: "word_boundary",
      placeholder: "label_counter",
    },
  };
}

export type Problem = { field: string; message: string };

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A TOML basic string: only the quote and the backslash need escaping. */
function quoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** Everything a browser can settle on its own, reported at once. */
export function configProblems(draft: ConfigDraft): Problem[] {
  const found: Problem[] = [];
  if (!NAME.test(draft.name))
    found.push({ field: "name", message: "name.kebab" });
  if (draft.tags.length === 0)
    found.push({ field: "tags", message: "tags.empty" });
  for (const language of ["en", "fr"] as const) {
    if (draft[language].trim() === "")
      found.push({ field: language, message: `description.empty.${language}` });
    if (/[—–]/.test(draft[language]))
      found.push({ field: language, message: "description.dash" });
  }

  const detectors = draft.detectors.filter((one) => one.name !== "");
  const parents = draft.extends.filter((one) => one.ref !== "");
  // A configuration that neither inherits nor declares anything resolves to an
  // empty pipeline, which piighost refuses at render.
  if (detectors.length === 0 && parents.length === 0)
    found.push({ field: "detectors", message: "detectors.one" });

  const seen = new Set<string>();
  for (const detector of detectors) {
    if (!NAME.test(detector.name))
      found.push({ field: "detectors", message: "detector.kebab" });
    if (seen.has(detector.name))
      found.push({ field: "detectors", message: "detector.twice" });
    seen.add(detector.name);
    // A regex detector with no group is a detector that detects nothing, which
    // the registry reports as an error rather than an empty result.
    if (detector.groups.length === 0)
      found.push({ field: "detectors", message: "detector.empty" });
  }
  return found;
}

/** Whether anything has been chosen yet, so a fresh form is not a list of faults. */
export function configStarted(draft: ConfigDraft): boolean {
  return (
    draft.tags.length > 0 ||
    draft.en.trim() !== "" ||
    draft.fr.trim() !== "" ||
    draft.extends.some((one) => one.ref !== "") ||
    draft.detectors.some((one) => one.name !== "" || one.groups.length > 0)
  );
}

/** The `config.toml` this draft describes. */
export function toConfigManifest(draft: ConfigDraft): string {
  const parents = draft.extends
    .filter((one) => one.ref !== "")
    .map((one) => {
      const exclude = one.exclude.length
        ? `\nexclude = [${one.exclude.map((entry) => `"${entry}"`).join(", ")}]`
        : "";
      return `\n[[extends]]\nref = "${one.ref}"${exclude}\n`;
    })
    .join("");

  const detectors = draft.detectors
    .filter((one) => one.name !== "")
    .map(
      (one) =>
        `\n[[detectors]]\nname = "${one.name}"\ntype = "regex"\ngroups = [${one.groups
          .map((group) => `"${group}"`)
          .join(", ")}]\n`,
    )
    .join("");

  const stages = [
    draft.stages.linker &&
      `\n[stages.linker]\ntype = "${draft.stages.linker}"\n`,
    draft.stages.expander &&
      `\n[stages.expander]\ntype = "${draft.stages.expander}"\n`,
    draft.stages.placeholder &&
      `\n[stages.anonymizer.placeholder]\ntype = "${draft.stages.placeholder}"\n`,
  ]
    .filter(Boolean)
    .join("");

  return `schema_version = 1

[config]
name = "${draft.name}"
description = { en = ${quoted(draft.en)}, fr = ${quoted(draft.fr)} }
tags = [${draft.tags.map((tag) => `"${tag}"`).join(", ")}]
piighost = "${draft.piighost}"
${parents}${detectors}${stages}`;
}

type Content = {
  name?: string;
  tags?: string[];
  description?: { en?: string; fr?: string };
  piighost?: string;
  extends?: { ref?: string; exclude?: string[] }[];
  detectors?: Record<string, unknown>[];
  stages?: Record<string, Record<string, unknown>>;
};

/**
 * Why this configuration cannot be a form, or nothing at all.
 *
 * Read before filling anything. Every reason is the name of a piece the form
 * has no field for, so the answer to a visitor is the specific thing in their
 * way rather than a shrug.
 */
export function unsupported(commit: CommitDetail): string[] {
  const content = commit.content as Content;
  const reasons: string[] = [];

  for (const detector of content.detectors ?? []) {
    if (detector.type !== "regex")
      reasons.push(
        `detector ${String(detector.name)} (${String(detector.type)})`,
      );
  }
  for (const [section, body] of Object.entries(content.stages ?? {})) {
    if (section === "linker" || section === "expander") {
      if (!(STAGES[section] as readonly string[]).includes(String(body.type)))
        reasons.push(`stage ${section} (${String(body.type)})`);
      continue;
    }
    if (section === "anonymizer") {
      const placeholder = (body.placeholder ?? {}) as Record<string, unknown>;
      const rest = Object.keys(body).filter((key) => key !== "placeholder");
      if (rest.length > 0)
        reasons.push(`stage anonymizer (${rest.join(", ")})`);
      if (!STAGES.placeholder.includes(String(placeholder.type) as never))
        reasons.push(`placeholder (${String(placeholder.type)})`);
      continue;
    }
    reasons.push(`stage ${section}`);
  }
  return reasons;
}

/** A draft from a configuration already in the registry. */
export function configDraftFrom(commit: CommitDetail): ConfigDraft {
  const content = commit.content as Content;
  const stages = content.stages ?? {};
  const placeholder = (stages.anonymizer?.placeholder ?? {}) as {
    type?: string;
  };

  const detectors = (content.detectors ?? [])
    .filter((detector) => detector.type === "regex")
    .map((detector) => ({
      name: String(detector.name ?? ""),
      // The pin is dropped: a fork that froze its groups at the moment it was
      // copied would never see them improve, and pinning is a decision to make
      // on purpose rather than inherit by accident.
      groups: ((detector.groups ?? []) as { ref?: string }[] | string[]).map(
        (group) =>
          (typeof group === "string" ? group : (group.ref ?? "")).split(":")[0],
      ),
    }));

  return {
    name: content.name ?? "",
    tags: [...(content.tags ?? [])],
    en: content.description?.en ?? "",
    fr: content.description?.fr ?? "",
    piighost: content.piighost ?? ">=1.7,<2",
    extends: (content.extends ?? []).map((one) => ({
      ref: (one.ref ?? "").split(":")[0],
      exclude: [...(one.exclude ?? [])],
    })),
    detectors: detectors.length > 0 ? detectors : emptyConfigDraft().detectors,
    stages: {
      linker: String(stages.linker?.type ?? ""),
      expander: String(stages.expander?.type ?? ""),
      placeholder: String(placeholder.type ?? ""),
    },
  };
}
