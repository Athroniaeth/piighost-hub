/**
 * A group, as a form rather than as TOML.
 *
 * A group holds no regex. It names sources in an order and, per source, the
 * labels it does not want. Both of those are choices a picker makes better than
 * a text field: the source has to exist in the registry, and an excluded label
 * has to be one that source actually provides, or the manifest is refused.
 *
 * The order is the whole point and the reason the rows can move. On two
 * identical spans the first source declared wins, so reordering is not
 * cosmetic, it decides which label a value comes out under.
 */

import type { CommitDetail } from "../generated/api";

export type Source = { ref: string; exclude: string[] };

export type GroupDraft = {
  name: string;
  tags: string[];
  en: string;
  sources: Source[];
};

export function emptyGroupDraft(): GroupDraft {
  return {
    name: "",
    tags: [],
    en: "",
    sources: [{ ref: "", exclude: [] }],
  };
}

export const GROUP_PLACEHOLDER = {
  name: "logs",
  en: "What a server log or a traceback carries: addresses, machine identifiers, and the credentials that end up in them by accident.",
} as const;

export type Problem = { field: string; message: string };

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A TOML basic string: only the quote and the backslash need escaping. */
function quoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

/** Everything a browser can settle on its own, reported at once. */
export function groupProblems(draft: GroupDraft): Problem[] {
  const found: Problem[] = [];
  if (!NAME.test(draft.name))
    found.push({ field: "name", message: "name.kebab" });
  if (draft.tags.length === 0)
    found.push({ field: "tags", message: "tags.empty" });
  if (draft.en.trim() === "")
    found.push({ field: "en", message: "description.empty" });
  if (/[—–]/.test(draft.en))
    found.push({ field: "en", message: "description.dash" });

  const sources = draft.sources.filter((source) => source.ref !== "");
  if (sources.length === 0)
    found.push({ field: "sources", message: "sources.one" });
  const seen = new Set<string>();
  for (const source of sources) {
    if (seen.has(source.ref))
      found.push({ field: "sources", message: "sources.twice" });
    seen.add(source.ref);
  }
  return found;
}

/** Whether anything has been chosen yet, so a fresh form is not a list of faults. */
export function groupStarted(draft: GroupDraft): boolean {
  return (
    draft.tags.length > 0 ||
    draft.en.trim() !== "" ||
    draft.sources.some((source) => source.ref !== "")
  );
}

/** The `group.toml` this draft describes. */
export function toGroupManifest(draft: GroupDraft): string {
  const sources = draft.sources
    .filter((source) => source.ref !== "")
    .map((source) => {
      const exclude = source.exclude.length
        ? `\nexclude = [${source.exclude.map((label) => `"${label}"`).join(", ")}]`
        : "";
      return `\n[[sources]]\nref = "${source.ref}"${exclude}\n`;
    })
    .join("");

  return `schema_version = 1

[group]
name = "${draft.name}"
description = { en = ${quoted(draft.en)} }
tags = [${draft.tags.map((tag) => `"${tag}"`).join(", ")}]
${sources}`;
}

/**
 * A draft from a group already in the registry.
 *
 * From the frozen commit, where every source reference is already pinned to the
 * commit it resolved to. The pin is dropped on the way in: a fork that froze
 * its parents at the moment it was copied would never see them improve, and
 * pinning is a decision to make deliberately rather than inherit by accident.
 */
export function groupDraftFrom(commit: CommitDetail): GroupDraft {
  const content = commit.content as {
    name?: string;
    tags?: string[];
    description?: { en?: string; fr?: string };
    sources?: { ref?: string; exclude?: string[] }[];
  };
  const sources = (content.sources ?? []).map((source) => ({
    ref: (source.ref ?? "").split(":")[0],
    exclude: [...(source.exclude ?? [])],
  }));
  return {
    name: content.name ?? "",
    tags: [...(content.tags ?? [])],
    en: content.description?.en ?? "",
    sources: sources.length > 0 ? sources : emptyGroupDraft().sources,
  };
}
