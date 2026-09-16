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
  [/^#.*/, "comment"],
  [/^\[\[?[^\]]*\]\]?/, "section"],
  [/^'[^']*'/, "string"],
  [/^"(?:[^"\\]|\\.)*"/, "string"],
  [/^\b(?:true|false)\b/, "boolean"],
  [/^-?\d+(?:\.\d+)?\b/, "number"],
  [/^[A-Za-z0-9_-]+(?=\s*=)/, "key"],
  [/^[=,{}[\]]/, "punctuation"],
  [/^\s+/, "space"],
];

/**
 * Walk a source against anchored rules, first match wins.
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
  let rest = source;
  while (rest.length > 0) {
    const rule = rules.find(([pattern]) => pattern.test(rest));
    if (!rule) {
      const last = tokens[tokens.length - 1];
      if (last && last.kind === fallback) last.text += rest[0];
      else tokens.push({ text: rest[0], kind: fallback });
      rest = rest.slice(1);
      continue;
    }
    const [pattern, kind] = rule;
    const [matched] = pattern.exec(rest)!;
    tokens.push({ text: matched, kind });
    rest = rest.slice(matched.length);
  }
  return tokens;
}

/** Tokenise TOML well enough to read a pipeline file. */
export function tomlTokens(source: string): Token[] {
  return tokenise(source, TOML_RULES, "text");
}

const REGEX_RULES: [RegExp, string][] = [
  [/^\\[dDwWsSbBAZ]/, "class"],
  [/^\\./, "escape"],
  [/^\(\?<[=!][^)]*/, "group"],
  [/^\(\?[:=!#]/, "group"],
  [/^[()]/, "group"],
  [/^\[(?:[^\]\\]|\\.)*\]/, "set"],
  [/^\{\d+(?:,\d*)?\}/, "quantifier"],
  [/^[*+?]/, "quantifier"],
  [/^\|/, "alternation"],
  [/^\^|^\$/, "anchor"],
];

/** Tokenise a regex so its structure is visible at a glance. */
export function regexTokens(source: string): Token[] {
  return tokenise(source, REGEX_RULES, "literal");
}

const PYTHON_RULES: [RegExp, string][] = [
  [/^#.*/, "comment"],
  [/^[A-Za-z]{0,2}"""[\s\S]*?"""/, "string"],
  [/^[A-Za-z]{0,2}'''[\s\S]*?'''/, "string"],
  [/^[A-Za-z]{0,2}"(?:[^"\\]|\\.)*"/, "string"],
  [/^[A-Za-z]{0,2}'(?:[^'\\]|\\.)*'/, "string"],
  [
    /^\b(?:from|import|as|def|class|return|await|async|if|elif|else|for|while|with|try|except|finally|raise|yield|lambda|pass|in|not|and|or|is)\b/,
    "keyword",
  ],
  [/^\b(?:None|True|False)\b/, "boolean"],
  [/^\b[A-Za-z_][A-Za-z0-9_]*(?=\()/, "function"],
  [/^\b\d+(?:\.\d+)?\b/, "number"],
  [/^[=(){}[\],.:]/, "punctuation"],
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
