"""Interactive routes: playground, chat demo, comparison, and submissions.

Everything here takes a body and runs something. Nothing is stored: a playground
run, a chat replay and a submission check all answer from the request alone, so
the API stays stateless and a second worker answers identically.
"""

from typing import Annotated

import msgspec
from litestar import Controller, post
from litestar.datastructures import State
from litestar.enums import RequestEncodingType
from litestar.params import Body
from litestar.status_codes import HTTP_200_OK

from backend.hub.errors import HubError, ResolutionError
from backend.hub.playground import (
    MAX_TEXT_LENGTH,
    Hit,
    PlaygroundError,
    Run,
    run_candidate,
    run_chat,
    run_ref,
)
from backend.hub.registry import Registry
from backend.hub.routes import (
    BadRequestError,
    UnprocessableError,
    _ref,
    _snapshot,
    registry_of,
)
from backend.hub.submissions import SubmissionResult, check_submission

MAX_MESSAGES = 20


class HitOut(msgspec.Struct):
    label: str
    start: int
    end: int
    text: str
    detector: str
    pattern: str | None
    kept: bool


class RunOut(msgspec.Struct):
    ref: str
    hits: list[HitOut]
    anonymized_text: str
    elapsed_ms: float
    truncated: bool
    unsupported: list[str]


class RunRequest(msgspec.Struct):
    """Run a registry object over a text."""

    ref: str
    text: str


class CandidateRequest(msgspec.Struct):
    """Try a regex that is not in the registry yet."""

    regex: str
    text: str
    label: str = "CANDIDATE"


class ChatRequest(msgspec.Struct):
    """Replay a conversation. The client sends every message each time."""

    ref: str
    messages: list[str]


class TurnOut(msgspec.Struct):
    user_text: str
    user_sent: str
    reply_received: str
    reply_text: str
    hits: list[HitOut]


class ChatOut(msgspec.Struct):
    ref: str
    turns: list[TurnOut]
    mapping: dict[str, str]


class CompareRequest(msgspec.Struct):
    """Run several objects over the same text."""

    refs: list[str]
    text: str


class CompareOut(msgspec.Struct):
    runs: list[RunOut]
    agreed: list[str]
    """Values every object caught, whatever the label."""
    disputed: list[str]
    """Values at least one object caught and at least one missed."""


class SubmissionRequest(msgspec.Struct):
    """A manifest a visitor wrote, checked before it becomes a pull request."""

    kind: str
    namespace: str
    name: str
    manifest: str


def _hits(hits: list[Hit]) -> list[HitOut]:
    return [
        HitOut(
            label=h.label,
            start=h.start,
            end=h.end,
            text=h.text,
            detector=h.detector,
            pattern=h.pattern,
            kept=h.kept,
        )
        for h in hits
    ]


def _run_out(ref: str, run: Run) -> RunOut:
    return RunOut(
        ref=ref,
        hits=_hits(run.hits),
        anonymized_text=run.anonymized_text,
        elapsed_ms=round(run.elapsed_ms, 3),
        truncated=run.truncated,
        unsupported=run.unsupported,
    )


def _guard_text(text: str) -> None:
    if len(text) > MAX_TEXT_LENGTH * 2:
        raise BadRequestError(
            f"text is {len(text)} characters; the playground accepts {MAX_TEXT_LENGTH}"
        )


async def _resolve_and_run(registry: Registry, ref_text: str, text: str) -> RunOut:
    ref = _ref(*_split(ref_text))
    snapshot = _snapshot(registry, ref)
    try:
        return _run_out(snapshot.ref, await run_ref(registry, snapshot, text))
    except ResolutionError as exc:
        raise UnprocessableError(str(exc)) from exc


def _split(ref_text: str) -> tuple[str, str, str | None]:
    body = ref_text.strip().removeprefix("hub:").removeprefix("//")
    namespace, _, rest = body.partition("/")
    name, sep, selector = rest.partition(":")
    return namespace, name, selector if sep else None


class PlaygroundController(Controller):
    """``/api/v1``: run things, compare them, and check a submission."""

    path = "/v1"
    tags = ("playground",)

    @post("/playground", name="hub:playground", status_code=HTTP_200_OK)
    async def playground(
        self,
        state: State,
        data: Annotated[RunRequest, Body(media_type=RequestEncodingType.JSON)],
    ) -> RunOut:
        """Run a pattern, a group or a config over a text.

        Registry patterns have passed the backtracking bound, so this runs in
        process. Nothing is logged or stored: the text is a visitor's, and it may
        well hold the very data the pipeline is meant to hide.
        """
        _guard_text(data.text)
        return await _resolve_and_run(registry_of(state), data.ref, data.text)

    @post("/playground/candidate", name="hub:candidate", status_code=HTTP_200_OK)
    async def candidate(
        self,
        data: Annotated[CandidateRequest, Body(media_type=RequestEncodingType.JSON)],
    ) -> RunOut:
        """Try a regex that has passed nothing yet, in a killed-on-timeout worker."""
        _guard_text(data.text)
        try:
            run = await run_candidate(data.regex, data.label, data.text)
        except PlaygroundError as exc:
            raise UnprocessableError(str(exc)) from exc
        return _run_out("candidate", run)

    @post("/playground/chat", name="hub:chat", status_code=HTTP_200_OK)
    async def chat(
        self,
        state: State,
        data: Annotated[ChatRequest, Body(media_type=RequestEncodingType.JSON)],
    ) -> ChatOut:
        """Replay a conversation against a config, with a scripted assistant.

        The reply is canned, which is what makes the demo free and reproducible:
        it shows the round trip, the restoration and one token per value across
        messages, none of which a real model would prove any better.
        """
        if len(data.messages) > MAX_MESSAGES:
            raise BadRequestError(f"at most {MAX_MESSAGES} messages per call")
        for message in data.messages:
            _guard_text(message)
        registry = registry_of(state)
        snapshot = _snapshot(registry, _ref(*_split(data.ref)))
        try:
            turns, mapping = await run_chat(registry, snapshot, data.messages)
        except ResolutionError as exc:
            raise UnprocessableError(str(exc)) from exc
        return ChatOut(
            ref=snapshot.ref,
            turns=[
                TurnOut(
                    user_text=t.user_text,
                    user_sent=t.user_sent,
                    reply_received=t.reply_received,
                    reply_text=t.reply_text,
                    hits=_hits(t.hits),
                )
                for t in turns
            ],
            mapping=mapping,
        )

    @post("/compare", name="hub:compare", status_code=HTTP_200_OK)
    async def compare(
        self,
        state: State,
        data: Annotated[CompareRequest, Body(media_type=RequestEncodingType.JSON)],
    ) -> CompareOut:
        """Run several objects over one text and say where they disagree."""
        if not 2 <= len(data.refs) <= 4:
            raise BadRequestError("compare takes between two and four references")
        _guard_text(data.text)
        registry = registry_of(state)
        runs = [await _resolve_and_run(registry, ref, data.text) for ref in data.refs]
        caught = [{h.text for h in run.hits if h.kept} for run in runs]
        every = set.intersection(*caught) if caught else set()
        any_of = set.union(*caught) if caught else set()
        return CompareOut(
            runs=runs,
            agreed=sorted(every),
            disputed=sorted(any_of - every),
        )

    @post("/submissions/check", name="hub:submission", status_code=HTTP_200_OK)
    async def submission(
        self,
        state: State,
        data: Annotated[SubmissionRequest, Body(media_type=RequestEncodingType.JSON)],
    ) -> SubmissionResult:
        """Check a manifest a visitor wrote, and hand back a ready pull request.

        Publishing stays a pull request against the registry repository: a config
        is data that ships into other people's pipelines, so it goes through
        review, and the trust boundary stays where git already enforces it.
        """
        if len(data.manifest) > 64_000:
            raise BadRequestError("manifest is too large")
        try:
            return await check_submission(
                registry_of(state), data.kind, data.namespace, data.name, data.manifest
            )
        except HubError as exc:
            raise UnprocessableError(str(exc)) from exc
