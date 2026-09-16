#!/usr/bin/env python3
"""Turn a batch of pattern proposals into registry manifests.

Research arrives as a list of proposals: a name, a label, a regex, a couple of
examples. Hand-writing the TOML for each one is where the inconsistency creeps
in, and where a missing `[redos]` recipe or a single-language description slips
through. This reads one JSON file and writes the manifests, refusing anything
the registry would reject later so the feedback arrives in a second rather than
after a full check run.

Usage:
    python3 scripts/new_patterns.py proposals.json [--registry registry] [--dry-run]

The input is a JSON list of objects, or an object carrying both the patterns
and the region tags they need, since a batch for a new country cannot be
imported before its tag exists:

    {"new_tags": {"ie": {"en": "Ireland", "fr": "Irlande"}}, "patterns": [...]}

A bare list is equivalent to that object with no new tags. The list holds:

    [
      {
        "name": "jp-my-number",
        "label": "JP_MY_NUMBER",
        "tags": ["jp", "government-id", "identity"],
        "regex": "(?<!\\\\d)\\\\d{4}[\\\\s-]?\\\\d{4}[\\\\s-]?\\\\d{4}(?!\\\\d)",
        "en": "Japanese individual number ...",
        "match": [["My Number 1234 5678 9012 on the form.", "1234 5678 9012"]],
        "no_match": ["1234 5678 901"],
        "redos": ["1234 ", "5678 ", "x"]
      }
    ]

Everything is validated before a single file is written: the regex compiles
under re.ASCII, each match value appears exactly once in its sentence and is
matched whole, each value survives the punctuation wrappers the registry check
applies, no example is missing, the description is present, no em-dash, and the
tags exist in the vocabulary. Standard library only.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path

WRAPPERS = ("{v}.", "{v},", "{v}\n", " {v} ", "({v})", "Reach me at {v}.")
LABEL = re.compile(r"^[A-Z][A-Z0-9_]*$")
NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

TEMPLATE = """schema_version = 1

[pattern]
name = "{name}"
label = "{label}"
tags = [{tags}]
regex = '{regex}'

[pattern.description]
en = "{en}"
{matches}{no_matches}
[redos]
prefix = "{prefix}"
filler = "{filler}"
suffix = "{suffix}"
"""


def check(proposal: dict, vocabulary: set[str], existing: set[str]) -> list[str]:
    """Every reason this proposal would be rejected, so one pass fixes them all."""
    problems: list[str] = []
    name = proposal.get("name", "")
    label = proposal.get("label", "")

    if not NAME.fullmatch(name):
        problems.append(f"name {name!r} is not kebab-case")
    if name in existing:
        problems.append(f"{name} already exists in the registry")
    if not LABEL.fullmatch(label):
        problems.append(f"label {label!r} must be UPPER_SNAKE")
    for tag in proposal.get("tags", []):
        if tag not in vocabulary:
            problems.append(f"unknown tag {tag!r}; add it to vocabulary.toml first")

    # English only. The registry was bilingual because the site was, and a
    # French description is accepted where one already exists rather than asked
    # for. See backend/hub/manifests.py.
    text = proposal.get("en", "")
    if not text:
        problems.append("the description is missing")
    if "—" in text or "–" in text:
        problems.append("the description holds an em-dash")

    regex = proposal.get("regex", "")
    if "'" in regex:
        problems.append(
            "the regex holds a single quote, which breaks the TOML literal string"
        )
    try:
        compiled = re.compile(regex, re.ASCII)
    except re.error as error:
        problems.append(f"regex does not compile: {error}")
        return problems

    matches = proposal.get("match", [])
    if len(matches) < 2:
        problems.append("at least two match examples are required")
    for text, value in matches:
        if text.count(value) != 1:
            problems.append(f"{value!r} must appear exactly once in {text!r}")
            continue
        found = [m.group() for m in compiled.finditer(text)]
        if value not in found:
            problems.append(
                f"{value!r} is not matched in {text!r}; the regex found {found}"
            )
        for wrapper in WRAPPERS:
            wrapped = [m.group() for m in compiled.finditer(wrapper.format(v=value))]
            if wrapped != [value]:
                problems.append(
                    f"wrapped as {wrapper!r}, {value!r} is matched as {wrapped}, not alone and whole"
                )
                break

    no_matches = proposal.get("no_match", [])
    if len(no_matches) < 2:
        problems.append("at least two no-match examples are required")
    for text in no_matches:
        found = [m.group() for m in compiled.finditer(text)]
        if found:
            problems.append(f"{text!r} must not match, but the regex found {found}")

    redos = proposal.get("redos")
    if not redos or len(redos) != 3:
        problems.append("a [redos] recipe of prefix, filler and suffix is required")
    return problems


def render(proposal: dict) -> str:
    matches = "".join(
        f'\n[[examples.match]]\ntext = "{text}"\nvalue = "{value}"\n'
        for text, value in proposal["match"]
    )
    no_matches = "".join(
        f'\n[[examples.no_match]]\ntext = "{t}"\n' for t in proposal["no_match"]
    )
    prefix, filler, suffix = proposal["redos"]
    return TEMPLATE.format(
        name=proposal["name"],
        label=proposal["label"],
        tags=", ".join(f'"{t}"' for t in proposal.get("tags", [])),
        regex=proposal["regex"],
        en=proposal["en"],
        matches=matches,
        no_matches=no_matches,
        prefix=prefix,
        filler=filler,
        suffix=suffix,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("proposals", type=Path)
    parser.add_argument("--registry", type=Path, default=Path("registry"))
    parser.add_argument("--namespace", default="piighost")
    parser.add_argument(
        "--dry-run", action="store_true", help="validate and report, write nothing"
    )
    args = parser.parse_args()

    vocabulary_path = args.registry / "vocabulary.toml"
    vocabulary = set(tomllib.loads(vocabulary_path.read_text()))
    patterns_dir = args.registry / "patterns" / args.namespace
    existing = (
        {p.name for p in patterns_dir.iterdir() if p.is_dir()}
        if patterns_dir.is_dir()
        else set()
    )

    payload = json.loads(args.proposals.read_text())
    if isinstance(payload, dict):
        proposals = payload.get("patterns", [])
        new_tags = payload.get("new_tags", {})
    else:
        proposals, new_tags = payload, {}

    # Declare the region tags first: a pattern for a new country is rejected for
    # an unknown tag otherwise, which reads as the pattern's fault when it is not.
    added = {tag: labels for tag, labels in new_tags.items() if tag not in vocabulary}
    vocabulary |= set(added)
    if added and not args.dry_run:
        with vocabulary_path.open("a") as handle:
            for tag, labels in added.items():
                handle.write(
                    f'\n[{tag}]\nkind = "region"\n'
                    f'label = {{ en = "{labels["en"]}", fr = "{labels["fr"]}" }}\n'
                )
    if added:
        print(f"region tags: {', '.join(sorted(added))}")
    rejected = 0
    accepted: list[dict] = []
    for proposal in proposals:
        problems = check(proposal, vocabulary, existing)
        if problems:
            rejected += 1
            print(f"\n{proposal.get('name', '?')}: rejected")
            for problem in problems:
                print(f"    {problem}")
            continue
        accepted.append(proposal)

    if not args.dry_run:
        for proposal in accepted:
            directory = patterns_dir / proposal["name"]
            directory.mkdir(parents=True, exist_ok=True)
            (directory / "pattern.toml").write_text(render(proposal))

    verb = "would write" if args.dry_run else "wrote"
    print(f"\n{verb} {len(accepted)}, rejected {rejected}")
    if accepted and not args.dry_run:
        print("next: uv run python -m backend.hub check --allow-unrecorded")
    return 1 if rejected else 0


if __name__ == "__main__":
    sys.exit(main())
