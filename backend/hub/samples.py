"""Annotated sample texts: the playground's ready-made inputs, and the corpus
every config is measured against.

A sample is data, not a published artifact: nobody pins a sample, so unlike a
pattern it carries no commit and no tag. It is annotated by value rather than by
offset, because an offset breaks the moment someone fixes a typo in the text,
and every occurrence of an annotated value is expected to be caught.
"""

import re
from dataclasses import dataclass
from pathlib import Path

import msgspec

from backend.hub.errors import ManifestError
from backend.hub.manifests import LABEL, SCHEMA_VERSION, LocalizedText, load_toml
from backend.hub.refs import is_valid_name

SAMPLES_DIR = "samples"


class Annotation(msgspec.Struct, forbid_unknown_fields=True):
    """A value a good pipeline is expected to catch, and under which label."""

    value: str
    label: str


class SampleBody(msgspec.Struct, forbid_unknown_fields=True):
    """The ``[sample]`` table."""

    name: str
    title: LocalizedText
    text: str
    tags: list[str] = msgspec.field(default_factory=list)


class SampleManifest(msgspec.Struct, forbid_unknown_fields=True):
    """``sample.toml``: one annotated text."""

    schema_version: int
    sample: SampleBody
    annotations: list[Annotation] = msgspec.field(default_factory=list)


@dataclass(slots=True)
class Sample:
    """A loaded sample."""

    name: str
    title: LocalizedText
    text: str
    tags: list[str]
    annotations: list[Annotation]

    def spans(self) -> list[tuple[int, int, str]]:
        """Every occurrence of every annotated value, with its expected label."""
        found: list[tuple[int, int, str]] = []
        for annotation in self.annotations:
            for match in re.finditer(re.escape(annotation.value), self.text):
                found.append((match.start(), match.end(), annotation.label))
        return sorted(found)


def load_samples(
    root: Path, vocabulary: set[str], problems: list[str]
) -> dict[str, Sample]:
    """Load every sample under ``<registry>/samples``, collecting problems."""
    samples: dict[str, Sample] = {}
    base = root / SAMPLES_DIR
    if not base.is_dir():
        return samples
    for path in sorted(base.glob("*/sample.toml")):
        try:
            manifest = load_toml(path, SampleManifest)
        except ManifestError as exc:
            problems.append(str(exc))
            continue
        body = manifest.sample
        if manifest.schema_version != SCHEMA_VERSION:
            problems.append(f"{path}: schema_version must be {SCHEMA_VERSION}")
        if body.name != path.parent.name or not is_valid_name(body.name):
            problems.append(
                f"{path}: name {body.name!r} must equal its kebab-case directory"
            )
        for tag in body.tags:
            if tag not in vocabulary:
                problems.append(f"{path}: unknown tag {tag!r}")
        for annotation in manifest.annotations:
            if not LABEL.fullmatch(annotation.label):
                problems.append(
                    f"{path}: label {annotation.label!r} must be UPPER_SNAKE"
                )
            if annotation.value not in body.text:
                problems.append(
                    f"{path}: annotated value {annotation.value!r} does not appear in the text"
                )
        samples[body.name] = Sample(
            name=body.name,
            title=body.title,
            text=body.text,
            tags=list(body.tags),
            annotations=list(manifest.annotations),
        )
    return samples
