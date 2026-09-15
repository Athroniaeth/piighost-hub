"""Diff two commits: which values do they treat differently?

Behavioural rather than textual. Two manifests can differ in every character and
catch exactly the same things, and two that differ by a single quantifier can
change what a user sees. So both commits run over the annotated samples and the
answer is the values whose label moved. No regex is read.
"""

from dataclasses import dataclass, field

from backend.hub.errors import ResolutionError
from backend.hub.playground import Hit, detector_sets, pattern_index, run_sets
from backend.hub.registry import Registry
from backend.hub.resolve import resolve_config, resolve_labels
from backend.hub.samples import Sample
from backend.hub.store import Snapshot


async def _run(registry: Registry, snapshot: Snapshot, text: str) -> list[Hit]:
    if snapshot.kind == "config":
        resolved = resolve_config(registry, snapshot)
        sets, skipped = detector_sets(resolved)
        provenance = pattern_index(resolved, None)
    else:
        labels = resolve_labels(registry, snapshot)
        sets = [(snapshot.name, labels.regexes())]
        provenance = pattern_index(None, labels)
        skipped = []
    if not sets:
        raise ResolutionError(f"{snapshot.ref} has no regex detector to run")
    run = await run_sets(sets, text, provenance=provenance, skipped=skipped)
    return [hit for hit in run.hits if hit.kept]


def _labels_of(registry: Registry, snapshot: Snapshot) -> set[str]:
    if snapshot.kind == "config":
        resolved = resolve_config(registry, snapshot)
        return {
            label
            for detector in resolved.detectors
            if detector.labels is not None
            for label in detector.labels.labels
        }
    return set(resolve_labels(registry, snapshot).labels)


@dataclass(slots=True)
class Change:
    """One value two commits disagree about."""

    text: str
    start: int
    end: int
    before: str | None
    """The label the older commit gave it, or None when it caught nothing."""
    after: str | None
    sample: str


@dataclass(slots=True)
class Diff:
    """What changed between two commits of the same object, on the corpus."""

    before: str
    after: str
    labels_added: list[str] = field(default_factory=list)
    labels_removed: list[str] = field(default_factory=list)
    changes: list[Change] = field(default_factory=list)

    @property
    def behavioural(self) -> bool:
        """Whether anything at all changes for the corpus."""
        return bool(self.changes or self.labels_added or self.labels_removed)


async def diff_commits(
    registry: Registry, before: Snapshot, after: Snapshot, samples: list[Sample]
) -> Diff:
    """Compare two commits by what they detect, not by their text.

    A regex diff says nothing a reader can act on: one character can widen a
    pattern across half the corpus or change nothing at all. Running both over
    the samples and listing the values that move is the readable form.
    """
    if before.key != after.key:
        raise ResolutionError(f"{before.key} and {after.key} are different objects")
    old_labels, new_labels = _labels_of(registry, before), _labels_of(registry, after)
    diff = Diff(
        before=before.ref,
        after=after.ref,
        labels_added=sorted(new_labels - old_labels),
        labels_removed=sorted(old_labels - new_labels),
    )
    for sample in samples:
        old_hits = {
            (h.start, h.end): h for h in await _run(registry, before, sample.text)
        }
        new_hits = {
            (h.start, h.end): h for h in await _run(registry, after, sample.text)
        }
        for span in sorted(set(old_hits) | set(new_hits)):
            old, new = old_hits.get(span), new_hits.get(span)
            if old is not None and new is not None and old.label == new.label:
                continue
            hit = new or old
            assert hit is not None
            diff.changes.append(
                Change(
                    text=hit.text,
                    start=span[0],
                    end=span[1],
                    before=old.label if old else None,
                    after=new.label if new else None,
                    sample=sample.name,
                )
            )
    return diff
