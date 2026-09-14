/**
 * The starting points the contribution page hands out.
 *
 * Two ways to begin, because there are two real stories. Someone adding a shape
 * the registry does not know starts from a blank manifest. Someone who wants
 * "fr-default, but without the SIRET and with our order numbers" should not copy
 * forty lines: the registry composes, so the base becomes a reference rather
 * than a duplicate. Only a pattern is genuinely copied, since tweaking a regex
 * means editing the regex.
 */

import type { ManifestOut } from "../generated/api";

export type Kind = "pattern" | "group" | "config";

export const KINDS: Kind[] = ["pattern", "group", "config"];

/** `ORDER_ID` out of `order-id`: the label convention is upper snake. */
export function labelOf(name: string): string {
  return name.toUpperCase().replace(/-/g, "_") || "MY_LABEL";
}

function blankPattern(name: string): string {
  return `schema_version = 1

[pattern]
name = "${name}"
label = "${labelOf(name)}"
tags = ["international", "business"]
regex = '\\bORD-[0-9]{6}\\b'

[pattern.description]
en = "Internal order identifier, six digits after an ORD- prefix."
fr = "Identifiant de commande interne, six chiffres apres un prefixe ORD-."

[[examples.match]]
text = "Order ORD-123456 shipped yesterday."
value = "ORD-123456"

[[examples.match]]
text = "Please cancel ORD-987654, wrong size."
value = "ORD-987654"

[[examples.no_match]]
text = "ORD-12"

[[examples.no_match]]
text = "ORD-1234567"

[redos]
prefix = "ORD-"
filler = "0"
suffix = "x"
`;
}

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

const BLANK: Record<Kind, (name: string) => string> = {
  pattern: blankPattern,
  group: blankGroup,
  config: blankConfig,
};

export function blank(kind: Kind, name: string): string {
  return BLANK[kind](name || `my-${kind}`);
}

/** Rewrite the first `key = "value"` assignment at the start of a line. */
function retitle(text: string, key: string, value: string): string {
  return text.replace(
    new RegExp(`^${key} = ".*"$`, "m"),
    `${key} = "${value}"`,
  );
}

/**
 * A manifest that starts from an existing object.
 *
 * A pattern is copied and renamed, because changing a shape means editing its
 * regex and its examples. A group includes the base as a source and a
 * configuration extends it, which is what the registry is built for: the base
 * keeps improving under you instead of freezing into a stale copy.
 */
export function basedOn(kind: Kind, name: string, base: ManifestOut): string {
  const wanted = name || `my-${kind}`;
  if (kind === "pattern") {
    return retitle(
      retitle(base.text, "name", wanted),
      "label",
      labelOf(wanted),
    );
  }
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
