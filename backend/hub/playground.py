"""Run a registry object, or a candidate regex, over a text.

Two execution paths, because the risk is not the same. A registry pattern has
already passed the backtracking bound, so it runs in a worker thread with a
capped text: cheap and fast. A candidate regex typed by a visitor has passed
nothing, so it runs in a spawned subprocess killed on timeout, which costs a
process start but cannot hang the server.

Nothing is stored. The chat demo keeps no state either: the client sends the
whole conversation each time, so a reply is reproducible and the server stays
horizontally scalable.
"""

import asyncio
import multiprocessing
import re
import time
from dataclasses import dataclass, field
from typing import Any

from piighost.components.detector import RegexDetector
from piighost.components.overlap_resolver import ConfidenceOverlapResolver
from piighost.models import Detection

from backend.hub.errors import HubError, ResolutionError
from backend.hub.registry import Registry
from backend.hub.resolve import (
    ResolvedConfig,
    ResolvedLabels,
    resolve_config,
    resolve_labels,
)
from backend.hub.store import Snapshot

MAX_TEXT_LENGTH = 20_000
"""Characters accepted from a caller. Registry patterns are bounded linear at
100k adversarial characters, so a fifth of that leaves two orders of magnitude
of headroom on the time budget."""

CANDIDATE_TIMEOUT_SECONDS = 2.0
"""Wall clock a candidate regex gets in its subprocess before it is killed."""

PLACEHOLDER = re.compile(r"<<[A-Z][A-Z0-9_]*(?::[A-Za-z0-9]+)?>>")
"""The token shape the label-counter factory emits, used by the chat demo."""


class PlaygroundError(HubError):
    """The caller's input is unusable: too long, or an uncompilable regex."""


@dataclass(frozen=True, slots=True)
class Hit:
    """One detection, with where the pattern that produced it came from."""

    label: str
    start: int
    end: int
    text: str
    detector: str
    pattern: str | None
    kept: bool
    """False when the overlap resolver dropped it in favour of another."""


@dataclass(slots=True)
class Run:
    """The result of running a detector set over a text."""

    hits: list[Hit] = field(default_factory=list)
    anonymized_text: str = ""
    elapsed_ms: float = 0.0
    truncated: bool = False
    unsupported: list[str] = field(default_factory=list)
    """Detectors that were not executed, by name: a model has to be downloaded
    and loaded, which a shared playground cannot do per request."""


def check_text(text: str) -> tuple[str, bool]:
    """Cap a caller's text, reporting whether it was cut."""
    if len(text) <= MAX_TEXT_LENGTH:
        return text, False
    return text[:MAX_TEXT_LENGTH], True


def detector_sets(
    resolved: ResolvedConfig,
) -> tuple[list[tuple[str, dict[str, str]]], list[str]]:
    """Split a config into runnable regex sets and the detectors left out."""
    runnable = [
        (d.name, d.labels.regexes()) for d in resolved.detectors if d.labels is not None
    ]
    skipped = [d.name for d in resolved.detectors if d.labels is None]
    return runnable, skipped


def pattern_index(
    resolved: ResolvedConfig | None, labels: ResolvedLabels | None
) -> dict[str, str]:
    """Map each label to the pattern commit that provided it."""
    index: dict[str, str] = {}
    if labels is not None:
        index.update({name: entry.pattern for name, entry in labels.labels.items()})
    if resolved is not None:
        for detector in resolved.detectors:
            if detector.labels is not None:
                for name, entry in detector.labels.labels.items():
                    index.setdefault(name, entry.pattern)
    return index


async def run_sets(
    sets: list[tuple[str, dict[str, str]]],
    text: str,
    *,
    provenance: dict[str, str] | None = None,
    skipped: list[str] | None = None,
) -> Run:
    """Detect with each set in order, resolve overlaps, and render the text.

    Dropped detections are kept in the result with ``kept=False``: seeing which
    pattern lost a span, and to whom, is the whole point of a playground.
    """
    capped, truncated = check_text(text)
    provenance = provenance or {}
    started = time.perf_counter()
    ordered: list[tuple[str, Detection]] = []
    for name, regexes in sets:
        for detection in await RegexDetector(regexes).detect(capped):
            ordered.append((name, detection))
    kept = ConfidenceOverlapResolver().resolve([d for _, d in ordered])
    elapsed = (time.perf_counter() - started) * 1000

    kept_keys = {(d.span.start, d.span.end, d.label) for d in kept}
    hits = [
        Hit(
            label=detection.label,
            start=detection.span.start,
            end=detection.span.end,
            text=detection.text,
            detector=name,
            pattern=provenance.get(detection.label),
            kept=(detection.span.start, detection.span.end, detection.label)
            in kept_keys,
        )
        for name, detection in ordered
    ]
    hits.sort(key=lambda hit: (hit.start, hit.end))
    return Run(
        hits=hits,
        anonymized_text=render(capped, kept),
        elapsed_ms=elapsed,
        truncated=truncated,
        unsupported=skipped or [],
    )


def render(text: str, kept: list[Detection]) -> str:
    """Replace each kept span with a label-counter token, as piighost does."""
    counters: dict[str, dict[str, int]] = {}
    pieces: list[str] = []
    cursor = 0
    for detection in sorted(kept, key=lambda d: d.span.start):
        seen = counters.setdefault(detection.label, {})
        value = detection.text.casefold()
        if value not in seen:
            seen[value] = len(seen) + 1
        pieces.append(text[cursor : detection.span.start])
        pieces.append(f"<<{detection.label}:{seen[value]}>>")
        cursor = detection.span.end
    pieces.append(text[cursor:])
    return "".join(pieces)


async def run_ref(registry: Registry, snapshot: Snapshot, text: str) -> Run:
    """Run whatever a reference designates: a pattern, a group or a config."""
    if snapshot.kind == "config":
        resolved = resolve_config(registry, snapshot)
        sets, skipped = detector_sets(resolved)
        if not sets:
            raise ResolutionError(f"{snapshot.ref} has no regex detector to run")
        return await run_sets(
            sets, text, provenance=pattern_index(resolved, None), skipped=skipped
        )
    labels = resolve_labels(registry, snapshot)
    return await run_sets(
        [(snapshot.name, labels.regexes())],
        text,
        provenance=pattern_index(None, labels),
    )


# ------------------------------------------------------------- candidate regex


def _candidate(regex: str, label: str, text: str, queue: Any) -> None:
    """Compile and scan in the child process."""
    compiled = re.compile(regex, re.ASCII)
    started = time.perf_counter()
    spans = [(m.start(), m.end(), m.group()) for m in compiled.finditer(text)]
    queue.put((spans, (time.perf_counter() - started) * 1000))


async def run_candidate(regex: str, label: str, text: str) -> Run:
    """Run an unvetted regex in a subprocess killed on timeout.

    Raises:
        PlaygroundError: If the regex does not compile, or the scan overran.
    """
    try:
        re.compile(regex, re.ASCII)
    except re.error as exc:
        raise PlaygroundError(f"regex does not compile: {exc}") from exc
    capped, truncated = check_text(text)
    status, result = await asyncio.to_thread(
        _run_candidate_blocking, regex, label, capped
    )
    if status == "timeout":
        raise PlaygroundError(
            f"the scan did not finish within {CANDIDATE_TIMEOUT_SECONDS}s; this regex "
            f"backtracks catastrophically and would hang a pipeline"
        )
    if status != "ok" or result is None:
        raise PlaygroundError("the worker process died before reporting a result")
    spans, elapsed = result
    detections = [
        Detection(span=_span(start, end), text=value, label=label, confidence=1.0)
        for start, end, value in spans
    ]
    kept = ConfidenceOverlapResolver().resolve(detections)
    return Run(
        hits=[
            Hit(
                label=label,
                start=start,
                end=end,
                text=value,
                detector="candidate",
                pattern=None,
                kept=True,
            )
            for start, end, value in spans
        ],
        anonymized_text=render(capped, kept),
        elapsed_ms=elapsed,
        truncated=truncated,
    )


def _span(start: int, end: int):
    from piighost.models import Span

    return Span(start, end)


CandidateResult = tuple[list[tuple[int, int, str]], float]


def _run_candidate_blocking(
    regex: str, label: str, text: str
) -> tuple[str, CandidateResult | None]:
    """Scan in a spawned child. Spawn rather than fork: this server runs threads,
    and forking one is what Python 3.14 warns about. A crashed child is reported
    apart from a hung one, so a visitor is not told their regex backtracks when
    the worker simply failed to start.
    """
    context = multiprocessing.get_context("spawn")
    queue = context.Queue()
    process = context.Process(
        target=_candidate, args=(regex, label, text, queue), daemon=True
    )
    process.start()
    try:
        process.join(CANDIDATE_TIMEOUT_SECONDS)
        if process.is_alive():
            return "timeout", None
        try:
            return "ok", queue.get(timeout=1.0)
        except Exception:  # noqa: BLE001 - an empty queue means the worker died
            return "crashed", None
    finally:
        if process.is_alive():
            process.kill()
        process.join()


# ----------------------------------------------------------------- chat demo

SCRIPTED_REPLY = (
    "Understood. I will use {tokens} as given, without commenting on their form. "
    "Tell me what to do next."
)
NO_TOKEN_REPLY = (
    "Nothing in that message looked like personal data, so it reached the model "
    "unchanged. Try adding an email address or a phone number."
)


def scripted_reply(anonymized: str) -> str:
    """Answer the way a compliant model would, quoting the tokens it received.

    A canned reply is what makes the demo free and reproducible: it proves the
    round trip, the restoration and the token stability without an API key, and
    a real model adds nothing to that proof.
    """
    tokens = list(dict.fromkeys(PLACEHOLDER.findall(anonymized)))
    if not tokens:
        return NO_TOKEN_REPLY
    if len(tokens) == 1:
        listed = tokens[0]
    else:
        listed = ", ".join(tokens[:-1]) + f" and {tokens[-1]}"
    return SCRIPTED_REPLY.format(tokens=listed)


@dataclass(slots=True)
class Turn:
    """One exchange of the chat demo, both sides in both forms."""

    user_text: str
    user_sent: str
    """What the model received: the user's message, de-identified."""
    reply_received: str
    """What the model answered, still holding tokens."""
    reply_text: str
    """What the user reads, tokens restored."""
    hits: list[Hit] = field(default_factory=list)


async def run_chat(
    registry: Registry, snapshot: Snapshot, messages: list[str]
) -> tuple[list[Turn], dict[str, str]]:
    """Replay a conversation, keeping one token per value across every message.

    Stateless on purpose: the caller sends the whole conversation, so two
    workers answer identically and nothing has to be stored between requests.
    """
    if snapshot.kind == "config":
        resolved = resolve_config(registry, snapshot)
        sets, _ = detector_sets(resolved)
        provenance = pattern_index(resolved, None)
    else:
        labels = resolve_labels(registry, snapshot)
        sets = [(snapshot.name, labels.regexes())]
        provenance = pattern_index(None, labels)
    if not sets:
        raise ResolutionError(f"{snapshot.ref} has no regex detector to run")

    counters: dict[str, dict[str, int]] = {}
    mapping: dict[str, str] = {}
    turns: list[Turn] = []
    for message in messages[:20]:
        capped, _ = check_text(message)
        detections: list[Detection] = []
        for name, regexes in sets:
            detections.extend(await RegexDetector(regexes).detect(capped))
        kept = ConfidenceOverlapResolver().resolve(detections)
        sent = _render_stable(capped, kept, counters, mapping)
        received = scripted_reply(sent)
        turns.append(
            Turn(
                user_text=capped,
                user_sent=sent,
                reply_received=received,
                reply_text=deanonymize(received, mapping),
                hits=[
                    Hit(
                        label=d.label,
                        start=d.span.start,
                        end=d.span.end,
                        text=d.text,
                        detector=sets[0][0],
                        pattern=provenance.get(d.label),
                        kept=True,
                    )
                    for d in kept
                ],
            )
        )
    return turns, mapping


def _render_stable(
    text: str,
    kept: list[Detection],
    counters: dict[str, dict[str, int]],
    mapping: dict[str, str],
) -> str:
    """Render with counters shared across messages, so a value keeps its token."""
    pieces: list[str] = []
    cursor = 0
    for detection in sorted(kept, key=lambda d: d.span.start):
        seen = counters.setdefault(detection.label, {})
        value = detection.text.casefold()
        if value not in seen:
            seen[value] = len(seen) + 1
        token = f"<<{detection.label}:{seen[value]}>>"
        mapping.setdefault(token, detection.text)
        pieces.append(text[cursor : detection.span.start])
        pieces.append(token)
        cursor = detection.span.end
    pieces.append(text[cursor:])
    return "".join(pieces)


def deanonymize(text: str, mapping: dict[str, str]) -> str:
    """Put the original values back wherever a known token appears."""
    return PLACEHOLDER.sub(lambda m: mapping.get(m.group(), m.group()), text)
