/**
 * Syntax highlighting as class names, never inline styles.
 *
 * The site's Content-Security-Policy allows `style-src 'self'`, with no
 * `unsafe-inline`, so a highlighter that emits `style="color:…"` would be
 * blocked in production and would only show up there. These functions return
 * tokens, the components map them to Tailwind classes.
 */

export type Token = { text: string; kind: string };

const TOML_RULES: [RegExp, string][] = [
  [/#.*/y, "comment"],
  [/\[\[?[^\]]*\]\]?/y, "section"],
  [/'[^']*'/y, "string"],
  [/"(?:[^"\\]|\\.)*"/y, "string"],
  [/\b(?:true|false)\b/y, "boolean"],
  [/-?\d+(?:\.\d+)?\b/y, "number"],
  [/[A-Za-z0-9_-]+(?=\s*=)/y, "key"],
  [/[=,{}[\]]/y, "punctuation"],
  [/\s+/y, "space"],
];

/**
 * Walk a source against sticky rules, first match wins.
 *
 * The rules are sticky and matched at an index into the whole source, never
 * against a slice of it. A slice loses what came before, and `\b` reads the
 * start of a string as a word boundary: `detector` sliced after `detect`
 * begins with `or`, which is how a Python keyword came to be painted inside
 * every identifier ending in one.
 *
 * What no rule claims is accumulated into one run of `fallback`, character by
 * character, so a block of ordinary text is one span and not one per letter.
 */
function tokenise(
  source: string,
  rules: [RegExp, string][],
  fallback: string,
): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    let matched: string | null = null;
    let kind = fallback;
    for (const [pattern, name] of rules) {
      pattern.lastIndex = index;
      const found = pattern.exec(source);
      if (found) {
        matched = found[0];
        kind = name;
        break;
      }
    }
    if (matched === null) {
      const last = tokens[tokens.length - 1];
      if (last && last.kind === fallback) last.text += source[index];
      else tokens.push({ text: source[index], kind: fallback });
      index += 1;
      continue;
    }
    tokens.push({ text: matched, kind });
    index += matched.length;
  }
  return tokens;
}

/** Tokenise TOML well enough to read a pipeline file. */
export function tomlTokens(source: string): Token[] {
  return tokenise(source, TOML_RULES, "text");
}

const REGEX_RULES: [RegExp, string][] = [
  [/\\[dDwWsSbBAZ]/y, "class"],
  [/\\./y, "escape"],
  [/\(\?<[=!][^)]*/y, "group"],
  [/\(\?[:=!#]/y, "group"],
  [/[()]/y, "group"],
  [/\[(?:[^\]\\]|\\.)*\]/y, "set"],
  [/\{\d+(?:,\d*)?\}/y, "quantifier"],
  [/[*+?]/y, "quantifier"],
  [/\|/y, "alternation"],
  [/\^|^\$/y, "anchor"],
];

/** Tokenise a regex so its structure is visible at a glance. */
export function regexTokens(source: string): Token[] {
  return tokenise(source, REGEX_RULES, "literal");
}

const PYTHON_RULES: [RegExp, string][] = [
  [/#.*/y, "comment"],
  [/[A-Za-z]{0,2}"""[\s\S]*?"""/y, "string"],
  [/[A-Za-z]{0,2}'''[\s\S]*?'''/y, "string"],
  [/[A-Za-z]{0,2}"(?:[^"\\]|\\.)*"/y, "string"],
  [/[A-Za-z]{0,2}'(?:[^'\\]|\\.)*'/y, "string"],
  [
    /\b(?:from|import|as|def|class|return|await|async|if|elif|else|for|while|with|try|except|finally|raise|yield|lambda|pass|in|not|and|or|is)\b/y,
    "keyword",
  ],
  [/\b(?:None|True|False)\b/y, "boolean"],
  [/\b[A-Za-z_][A-Za-z0-9_]*(?=\()/y, "function"],
  [/\b\d+(?:\.\d+)?\b/y, "number"],
  [/[=(){}[\],.:]/y, "punctuation"],
];

/** Tokenise Python well enough to read a four-line snippet. */
export function pythonTokens(source: string): Token[] {
  return tokenise(source, PYTHON_RULES, "text");
}

// The commands the snippets actually emit. An allowlist, because a word is a
// command by where it sits, not by how it is spelled: `piighost` also appears
// inside `ghcr.io/athroniaeth/piighost-api`, which is an image name.
const COMMANDS = new Set(["piighost", "curl", "docker", "python", "pip", "uv"]);

const SHELL_SPACE = /^[ \t]+/;
const SHELL_COMMENT = /^#.*/;
const SHELL_STRING = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/;
const SHELL_WORD = /^[A-Za-z][\w.-]*/;
const SHELL_FLAG = /^--?[A-Za-z][\w-]*/;
const SHELL_ENV = /^[A-Z][A-Z0-9_]{2,}(?==)/;

/**
 * Tokenise a shell one-liner: the command, its flags, its quoted arguments.
 *
 * Position decides here, which is why this one is written out rather than
 * handed to `tokenise`: a command is the first word of a line and a flag is a
 * dash that follows a space. Matching them anywhere painted `dev-secrets` as a
 * flag and the `piighost` inside an image name as a command.
 */
export function shellTokens(source: string): Token[] {
  const tokens: Token[] = [];
  const push = (text: string, kind: string) => {
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) last.text += text;
    else tokens.push({ text, kind });
  };

  source.split("\n").forEach((line, index) => {
    if (index > 0) push("\n", "text");
    let rest = line;
    let first = true;
    let spaced = true;
    while (rest.length > 0) {
      const take = (pattern: RegExp, kind: string, opens = false) => {
        const found = pattern.exec(rest);
        if (!found) return false;
        push(found[0], kind);
        rest = rest.slice(found[0].length);
        spaced = false;
        if (!opens) first = false;
        return true;
      };

      const space = SHELL_SPACE.exec(rest);
      if (space) {
        push(space[0], "space");
        rest = rest.slice(space[0].length);
        spaced = true;
        continue;
      }
      if (take(SHELL_COMMENT, "comment")) continue;
      if (take(SHELL_STRING, "string")) continue;
      if (first) {
        const word = SHELL_WORD.exec(rest);
        if (word && COMMANDS.has(word[0])) {
          take(SHELL_WORD, "command");
          continue;
        }
      }
      if (spaced && take(SHELL_FLAG, "flag")) continue;
      if (spaced && take(SHELL_ENV, "key")) continue;
      push(rest[0], "text");
      rest = rest.slice(1);
      spaced = false;
      first = false;
    }
  });
  return tokens;
}

export type Segment = {
  text: string;
  hit?: {
    label: string;
    kept: boolean;
    detector: string;
    pattern: string | null;
  };
};

/**
 * Cut a text into plain runs and detected runs.
 *
 * Only kept detections become segments: a dropped one overlaps a kept one by
 * definition, and two overlapping highlights cannot both be drawn. The dropped
 * ones are listed beside the text instead.
 */
export function segments(
  text: string,
  hits: {
    start: number;
    end: number;
    label: string;
    kept: boolean;
    detector: string;
    pattern: string | null;
  }[],
): Segment[] {
  const kept = hits.filter((hit) => hit.kept).sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  for (const hit of kept) {
    if (hit.start < cursor) continue;
    if (hit.start > cursor) out.push({ text: text.slice(cursor, hit.start) });
    out.push({
      text: text.slice(hit.start, hit.end),
      hit: {
        label: hit.label,
        kept: hit.kept,
        detector: hit.detector,
        pattern: hit.pattern,
      },
    });
    cursor = hit.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
