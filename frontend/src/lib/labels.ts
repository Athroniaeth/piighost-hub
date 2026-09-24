/**
 * Entity colours, from the piighost charter (piighost-identite, CHARTE.md,
 * section 6): eight hues, the same on every surface.
 *
 * Colours are handed out by first appearance, so the first eight distinct
 * labels each get their own hue before any repeats. No label is special:
 * `--primary` is reserved for the one active thing on screen and is never a
 * data colour, which is why PERSON no longer takes it.
 *
 * The classes are real rules in app.css, not Tailwind utilities, so the purger
 * cannot drop them. A value and its placeholder wear the same colour; the text
 * alone says which is which.
 */

/** Kept for the callers that test for a fixed label; none is fixed any more. */
export const FIXED_STYLES: Record<string, string> = {};

export const PALETTE = [
  "entite-01-valeur",
  "entite-02-valeur",
  "entite-03-valeur",
  "entite-04-valeur",
  "entite-05-valeur",
  "entite-06-valeur",
  "entite-07-valeur",
  "entite-08-valeur",
] as const;

/** Assign a colour class to every label by first-appearance order. */
export function assignLabelColors(
  labels: Iterable<string>,
): Map<string, string> {
  const map = new Map<string, string>();
  let next = 0;
  for (const label of labels) {
    if (map.has(label)) continue;
    if (label in FIXED_STYLES) {
      map.set(label, FIXED_STYLES[label]);
      continue;
    }
    map.set(label, PALETTE[next % PALETTE.length]);
    next += 1;
  }
  return map;
}

/**
 * A stable colour for a label seen alone, outside a run. Hashing keeps the same
 * label on the same hue from one page to the next, which appearance order
 * cannot promise across pages.
 */
export function labelStyle(
  label: string,
  colors?: Map<string, string>,
): string {
  const assigned = colors?.get(label);
  if (assigned) return assigned;
  if (label in FIXED_STYLES) return FIXED_STYLES[label];
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
