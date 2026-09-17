/**
 * Write one HTML file per route, so a crawler that does not run JavaScript
 * still reads the registry.
 *
 * The site is a single page application: every URL served the same 1.3 KB of
 * empty document, with `piighost hub` as its title and nothing in its body.
 * Google renders JavaScript, eventually and within a budget; the crawlers that
 * feed the assistants people now ask "how do I redact PII before a prompt"
 * mostly do not. Two hundred and twenty-six pages of real content were
 * invisible to them.
 *
 * This runs after `vite build` and rewrites `dist/<route>/index.html` from the
 * built document, so the hashed asset URLs stay right. The head gets a real
 * title, description, canonical and JSON-LD; `#app` gets the same content the
 * application renders, in plain HTML. The bundle then replaces it on mount, so
 * a visitor and a crawler are served the same page — no cloaking, and the
 * prerendered copy is what shows while the bundle loads.
 *
 * Reads the manifests straight from `registry/`, not from the API: a build must
 * not need a running server, and the registry is already in the build context.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const REGISTRY = join(ROOT, "registry");
const DIST = resolve(HERE, "..", "dist");
const ORIGIN =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://hub.piighost.dev";

const KINDS = {
  patterns: { file: "pattern.toml", key: "pattern", kind: "pattern" },
  groups: { file: "group.toml", key: "group", kind: "group" },
  configs: { file: "config.toml", key: "config", kind: "config" },
};

/** Escape the five characters that change the meaning of markup. */
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Every object in the registry, as {key, kind, name, description, content}. */
function readRegistry() {
  const objects = [];
  for (const [directory, spec] of Object.entries(KINDS)) {
    const root = join(REGISTRY, directory);
    if (!existsSync(root)) continue;
    for (const namespace of readdirSync(root)) {
      for (const name of readdirSync(join(root, namespace))) {
        const path = join(root, namespace, name, spec.file);
        if (!existsSync(path)) continue;
        const data = parse(readFileSync(path, "utf8"));
        const body = data[spec.key] ?? {};
        objects.push({
          key: `${namespace}/${name}`,
          kind: spec.kind,
          name,
          tags: body.tags ?? [],
          label: body.label ?? null,
          regex: body.regex ?? null,
          description: (body.description ?? {}).en ?? "",
          sources: (data.sources ?? []).map((s) => s.ref).filter(Boolean),
          examples: data.examples ?? {},
        });
      }
    }
  }
  return objects.sort((a, b) => a.key.localeCompare(b.key));
}

/** The first sentence, which is where a description says what it is. */
function summary(text, limit = 155) {
  const first = String(text).trim().split(". ")[0].trim();
  const clipped =
    first.length > limit
      ? `${first.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`
      : first;
  return clipped + (clipped.endsWith("…") || clipped.endsWith(".") ? "" : ".");
}

/** The readable body of an object page, which the bundle replaces on mount. */
function objectBody(object) {
  const parts = [
    `<h1>${esc(object.key)}</h1>`,
    `<p>${esc(object.description)}</p>`,
  ];
  if (object.label)
    parts.push(`<p>Label: <code>${esc(object.label)}</code></p>`);
  if (object.regex)
    parts.push(`<h2>Pattern</h2><pre><code>${esc(object.regex)}</code></pre>`);
  if (object.sources.length) {
    const items = object.sources
      .map(
        (ref) =>
          `<li><a href="/r/${esc(ref.split(":")[0])}">${esc(ref)}</a></li>`,
      )
      .join("");
    parts.push(`<h2>Sources</h2><ul>${items}</ul>`);
  }
  const matches = object.examples.match ?? [];
  if (matches.length) {
    const items = matches
      .map(
        (e) =>
          `<li><code>${esc(e.text)}</code> → <code>${esc(e.value)}</code></li>`,
      )
      .join("");
    parts.push(`<h2>Must be caught</h2><ul>${items}</ul>`);
  }
  const noMatches = object.examples.no_match ?? [];
  if (noMatches.length) {
    const items = noMatches
      .map((e) => `<li><code>${esc(e.text)}</code></li>`)
      .join("");
    parts.push(`<h2>Must be left alone</h2><ul>${items}</ul>`);
  }
  if (object.tags.length) {
    parts.push(`<p>Tags: ${object.tags.map((t) => esc(t)).join(", ")}</p>`);
  }
  parts.push(
    `<p><a href="/api/v1/refs/${esc(object.key)}/latest/pipeline.toml?part=detector">` +
      `Download the detector as TOML</a></p>`,
  );
  return parts.join("\n      ");
}

/**
 * schema.org for an object.
 *
 * A registry entry is a Dataset, and the registry a DataCatalog. That is not a
 * stretch to please a crawler: each object is a versioned, addressable set of
 * records with a licence and a provenance, which is what the vocabulary means.
 * It also puts the hub in Google Dataset Search, where nothing in this field
 * currently is.
 */
function objectJsonLd(object) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: object.key,
    description:
      object.description || `The ${object.key} de-identification pattern.`,
    url: `${ORIGIN}/r/${object.key}`,
    identifier: object.key,
    keywords: [
      ...object.tags,
      "PII",
      "de-identification",
      "regex",
      "pseudonymization",
    ],
    license: "https://opensource.org/licenses/MIT",
    isPartOf: { "@type": "DataCatalog", name: "piighost hub", url: ORIGIN },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/toml",
      contentUrl: `${ORIGIN}/api/v1/refs/${object.key}/latest/pipeline.toml?part=detector`,
    },
  };
}

/** Replace the head metadata of the built document and fill `#app`. */
function render(template, { title, description, canonical, jsonLd, body }) {
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(description)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${esc(title)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${esc(description)}" />`,
  );
  const head = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");
  html = html.replace("</head>", `  ${head}\n  </head>`);
  return html.replace(
    '<div id="app"></div>',
    `<div id="app">\n      ${body}\n    </div>`,
  );
}

function write(route, html) {
  const directory = join(DIST, route === "/" ? "." : route.replace(/^\//, ""));
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "index.html"), html);
}

const template = readFileSync(join(DIST, "index.html"), "utf8");
const objects = readRegistry();
const counts = { pattern: 0, group: 0, config: 0 };
for (const object of objects) counts[object.kind] += 1;

for (const object of objects) {
  const kindName = object.kind === "config" ? "piighost config" : object.kind;
  write(
    `/r/${object.key}`,
    render(template, {
      title: `${object.key} — ${kindName} — piighost hub`,
      description: summary(object.description),
      canonical: `${ORIGIN}/r/${object.key}`,
      jsonLd: objectJsonLd(object),
      body: objectBody(object),
    }),
  );
}

const STATIC = [
  {
    route: "/",
    title: "piighost hub — tested de-identification regexes",
    description:
      `A registry of ${counts.pattern} tested de-identification regex patterns and ` +
      `${counts.group} groups for piighost, each carrying the cases it must catch and ` +
      `the cases it must leave alone.`,
    heading: "piighost hub",
  },
  {
    route: "/labels",
    title: "Labels — piighost hub",
    description:
      "Every label the registry emits, and the patterns that define it, from EMAIL " +
      "and FR_SIRET to the credential shapes a traceback leaks.",
    heading: "Labels",
  },
  {
    route: "/configs",
    title: "piighost configs — piighost hub",
    description:
      "Pipelines assembled from the registry's groups: a detector, then what happens " +
      "once something is found.",
    heading: "piighost configs",
  },
  {
    route: "/playground",
    title: "Playground — run a de-identification pattern on your own text",
    description:
      "Run any registry object over a text and see what it catches, what it drops " +
      "and why. Your text is never written to a database.",
    heading: "Playground",
  },
  {
    route: "/playground/compare",
    title: "Compare de-identification patterns — piighost hub",
    description:
      "Run several registry objects over the same text and see where they disagree, " +
      "value by value.",
    heading: "Compare",
  },
  {
    route: "/contribute",
    title: "Contribute a pattern — piighost hub",
    description:
      "Propose a regex pattern or a group of patterns. Checked here with the " +
      "maintainers' own tests, merged by pull request.",
    heading: "Contribute",
  },
  {
    route: "/stats",
    title: "Usage — piighost hub",
    description:
      "What the registry is asked for: pulls, searches and the objects behind them.",
    heading: "Usage",
  },
];

const catalog = {
  "@context": "https://schema.org",
  "@type": "DataCatalog",
  name: "piighost hub",
  url: ORIGIN,
  description:
    "A registry of tested de-identification regexes for piighost: patterns, and the " +
    "groups that compose them.",
  license: "https://opensource.org/licenses/MIT",
  keywords: [
    "PII",
    "de-identification",
    "pseudonymization",
    "regex",
    "LLM",
    "GDPR",
    "prompt privacy",
  ],
  provider: {
    "@type": "Organization",
    name: "piighost",
    url: "https://piighost.dev",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${ORIGIN}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

for (const page of STATIC) {
  write(
    page.route,
    render(template, {
      title: page.title,
      description: page.description,
      canonical: `${ORIGIN}${page.route}`,
      jsonLd: catalog,
      body: `<h1>${esc(page.heading)}</h1>\n      <p>${esc(page.description)}</p>`,
    }),
  );
}

const digest = createHash("sha256").update(template).digest("hex").slice(0, 8);
console.log(
  `prerendered ${objects.length} objects and ${STATIC.length} pages ` +
    `from dist/index.html (${digest}) for ${ORIGIN}`,
);
