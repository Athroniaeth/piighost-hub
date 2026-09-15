/**
 * The starting points the contribution page hands out for a group and a
 * configuration.
 *
 * Two ways to begin, because there are two real stories. Someone adding
 * something the registry does not have starts from a blank manifest. Someone
 * who wants "fr-default, but without the SIRET and with our order numbers"
 * should not copy forty lines: the registry composes, so the base becomes a
 * reference rather than a duplicate.
 *
 * A pattern is absent on purpose. It has a form of its own, which writes the
 * manifest and fills itself from an existing pattern, so nobody hand-writes
 * `pattern.toml` here any more. See `pattern-draft.ts`.
 */

import type { ManifestOut } from "../generated/api";

export type Kind = "pattern" | "group" | "config";

export const KINDS: Kind[] = ["pattern", "group", "config"];

function blankGroup(name: string): string {
  return `schema_version = 1

[group]
name = "${name}"
description = { en = "What this group is for, in one sentence.", fr = "Ce a quoi sert ce groupe, en une phrase." }
tags = ["international", "business"]

[[sources]]
ref = "piighost/email"

[[sources]]
ref = "piighost/credit-card"
`;
}

function blankConfig(name: string): string {
  return `schema_version = 1

[config]
name = "${name}"
description = { en = "What this configuration is for, in one sentence.", fr = "Ce a quoi sert cette configuration, en une phrase." }
tags = ["international", "chat"]
piighost = ">=1.7,<2"

[[detectors]]
name = "regex"
type = "regex"
groups = ["piighost/generic"]

[stages.linker]
type = "exact"

[stages.anonymizer.placeholder]
type = "label_counter"
`;
}

const BLANK: Partial<Record<Kind, (name: string) => string>> = {
  group: blankGroup,
  config: blankConfig,
};

export function blank(kind: Kind, name: string): string {
  return (BLANK[kind] ?? blankGroup)(name || `my-${kind}`);
}

/**
 * A manifest that starts from an existing object.
 *
 * A group includes the base as a source and a configuration extends it, which
 * is what the registry is built for: the base keeps improving under you instead
 * of freezing into a stale copy.
 */
export function basedOn(kind: Kind, name: string, base: ManifestOut): string {
  const wanted = name || `my-${kind}`;
  if (kind === "group") {
    return `schema_version = 1

[group]
name = "${wanted}"
description = { en = "Everything ${base.key} carries, plus our own shapes.", fr = "Tout ce que porte ${base.key}, plus nos propres motifs." }
tags = ["international", "business"]

[[sources]]
ref = "${base.key}"

# Add your own patterns below. A label defined twice is an error, so exclude
# the one you are replacing: exclude = ["label:EMAIL"] on the source above.
`;
  }
  return `schema_version = 1

[config]
name = "${wanted}"
description = { en = "${base.key}, adjusted for our use case.", fr = "${base.key}, ajuste pour notre usage." }
tags = ["international", "chat"]
piighost = ">=1.7,<2"

[[extends]]
ref = "${base.key}"
# Drop what you do not want from the base, by label, detector or stage:
# exclude = ["label:IBAN", "detector:ner", "stage:guard"]
`;
}
