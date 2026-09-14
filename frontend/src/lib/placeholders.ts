/**
 * Placeholder tokens, the `<<LABEL:1>>` shape the label-counter factory emits.
 *
 * The site reads them in three places (the anonymised view, the chat's
 * model-side bubbles, the token table), so the grammar lives here rather than
 * being re-written as a regex literal each time.
 */

/** Matches a token and captures its label. Global: use with `matchAll`. */
export const PLACEHOLDER = /<<([A-Z][A-Z0-9_]*)(?::[A-Za-z0-9]+)?>>/g;

/** The label inside a token, or null when the text is not one. */
export function placeholderLabel(token: string): string | null {
  const match = /^<<([A-Z][A-Z0-9_]*)(?::[A-Za-z0-9]+)?>>$/.exec(token);
  return match ? match[1] : null;
}

/** Every distinct label appearing as a token in a text, in order. */
export function labelsIn(text: string): string[] {
  const seen: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (!seen.includes(match[1])) seen.push(match[1]);
  }
  return seen;
}
