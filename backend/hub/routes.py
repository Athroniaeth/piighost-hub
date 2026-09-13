"""Read-only hub API: what the ``piighost hub`` CLI and the site consume.

Public on purpose: a third party resolves ``hub:`` references from its own
deployment, so these routes carry no API key guard. They only serve what the
registry already publishes. A commit is immutable, so a response selected by
commit is cached forever; one selected by tag must be revalidated.
"""

import os
from collections.abc import Sequence
from pathlib import Path
from typing import Annotated, Any, Literal

import msgspec
from litestar import Controller, Litestar, Response, get
from litestar.datastructures import State
from litestar.params import FromPath, QueryParameter
from litestar.status_codes import HTTP_400_BAD_REQUEST, HTTP_422_UNPROCESSABLE_ENTITY

from backend import REGISTRY_ROOT
from backend.exceptions import AppError, NotFoundError
from backend.hub.errors import RefError, ResolutionError
from backend.hub.refs import Ref, is_commit, parse_ref
from backend.hub.registry import Registry
from backend.hub.render import render_labels_pipeline, render_pipeline, to_toml
from backend.hub.resolve import resolve_config, resolve_labels
from backend.hub.store import Snapshot

REGISTRY_DIR_ENV_VAR = "HUB_REGISTRY_DIR"
STATE_KEY = "hub_registry"

IMMUTABLE = "public, max-age=31536000, immutable"
REVALIDATE = "public, no-cache"
TOML_MEDIA_TYPE = "application/toml"


class BadRequestError(AppError):
    status_code = HTTP_400_BAD_REQUEST
    detail = "Bad request"


class UnprocessableError(AppError):
    status_code = HTTP_422_UNPROCESSABLE_ENTITY
    detail = "Unprocessable"


# ---------------------------------------------------------------- responses


class Localized(msgspec.Struct):
    en: str
    fr: str


class ObjectSummary(msgspec.Struct):
    key: str
    kind: Literal["pattern", "group", "config"]
    namespace: str
    name: str
    description: Localized
    tags: list[str]
    latest: str
    pointers: dict[str, str]


class ObjectList(msgspec.Struct):
    items: list[ObjectSummary]


class CommitSummary(msgspec.Struct):
    commit: str
    digest: str
    recorded_at: str | None


class ObjectDetail(msgspec.Struct):
    key: str
    kind: Literal["pattern", "group", "config"]
    namespace: str
    name: str
    description: Localized
    tags: list[str]
    latest: str
    pointers: dict[str, str]
    commits: list[CommitSummary]


class CommitDetail(msgspec.Struct):
    key: str
    kind: Literal["pattern", "group", "config"]
    commit: str
    digest: str
    recorded_at: str | None
    content: dict[str, Any]


class ResolvedLabelOut(msgspec.Struct):
    label: str
    regex: str
    pattern: str
    via: list[str]


class ResolvedDetectorOut(msgspec.Struct):
    name: str
    type: str
    groups: list[str]
    labels: list[ResolvedLabelOut] | None


class Resolved(msgspec.Struct):
    ref: str
    kind: Literal["pattern", "group", "config"]
    labels: list[ResolvedLabelOut] | None
    detectors: list[ResolvedDetectorOut] | None
    stages: dict[str, Any] | None
    pipeline: dict[str, Any]


class VocabularyEntry(msgspec.Struct):
    tag: str
    kind: str
    label: Localized


class VocabularyOut(msgspec.Struct):
    items: list[VocabularyEntry]


# ------------------------------------------------------------------ startup


def load_hub_registry(app: Litestar) -> None:
    """Load the registry once at startup; an invalid registry stops the app.

    Read from the environment here rather than at import so a test can point
    the app at a fixture tree before the lifespan runs.
    """
    root = os.getenv(REGISTRY_DIR_ENV_VAR)
    app.state[STATE_KEY] = Registry.load(REGISTRY_ROOT if root is None else Path(root))


def registry_of(state: State) -> Registry:
    return state[STATE_KEY]


# ---------------------------------------------------------------- controller


class HubController(Controller):
    """``/api/v1``: objects, commits, resolution and rendering."""

    path = "/v1"
    tags: Sequence[str] | None = ("hub",)

    @get("/vocabulary", name="hub:vocabulary")
    async def vocabulary(self, state: State) -> VocabularyOut:
        registry = registry_of(state)
        return VocabularyOut(
            items=[
                VocabularyEntry(
                    tag=tag, kind=d.kind, label=Localized(d.label.en, d.label.fr)
                )
                for tag, d in registry.vocabulary.items()
            ]
        )

    @get("/refs", name="hub:list")
    async def list_objects(
        self,
        state: State,
        kind: Annotated[
            Literal["pattern", "group", "config"] | None,
            QueryParameter(description="Keep one kind only."),
        ] = None,
        tag: Annotated[
            str | None, QueryParameter(description="Keep objects carrying this tag.")
        ] = None,
    ) -> ObjectList:
        registry = registry_of(state)
        items = [
            _summary(registry, head)
            for key, head in sorted(registry.heads.items())
            if (kind is None or head.kind == kind)
            and (tag is None or tag in head.content.get("tags", []))
        ]
        return ObjectList(items=items)

    @get("/refs/{namespace:str}/{name:str}", name="hub:object")
    async def object_detail(
        self, state: State, namespace: FromPath[str], name: FromPath[str]
    ) -> ObjectDetail:
        registry = registry_of(state)
        ref = _ref(namespace, name)
        head = registry.heads.get(ref.key)
        if head is None:
            raise NotFoundError
        summary = _summary(registry, head)
        return ObjectDetail(
            **msgspec.structs.asdict(summary),
            commits=[
                CommitSummary(
                    commit=s.short, digest=s.digest, recorded_at=s.recorded_at
                )
                for s in registry.history(ref.key)
            ],
        )

    @get("/refs/{namespace:str}/{name:str}/{selector:str}", name="hub:commit")
    async def commit_detail(
        self,
        state: State,
        namespace: FromPath[str],
        name: FromPath[str],
        selector: FromPath[str],
    ) -> Response[CommitDetail]:
        snapshot = _snapshot(registry_of(state), _ref(namespace, name, selector))
        body = CommitDetail(
            key=snapshot.key,
            kind=snapshot.kind,
            commit=snapshot.short,
            digest=snapshot.digest,
            recorded_at=snapshot.recorded_at,
            content=snapshot.content,
        )
        return Response(body, headers=_cache_headers(selector, snapshot))

    @get(
        "/refs/{namespace:str}/{name:str}/{selector:str}/resolved", name="hub:resolved"
    )
    async def resolved(
        self,
        state: State,
        namespace: FromPath[str],
        name: FromPath[str],
        selector: FromPath[str],
    ) -> Response[Resolved]:
        registry = registry_of(state)
        snapshot = _snapshot(registry, _ref(namespace, name, selector))
        try:
            body = _resolve(registry, snapshot)
        except ResolutionError as exc:
            raise UnprocessableError(str(exc)) from exc
        return Response(body, headers=_cache_headers(selector, snapshot))

    @get(
        "/refs/{namespace:str}/{name:str}/{selector:str}/pipeline.toml",
        name="hub:pipeline",
    )
    async def pipeline_toml(
        self,
        state: State,
        namespace: FromPath[str],
        name: FromPath[str],
        selector: FromPath[str],
        memory: Annotated[
            Literal["in_memory", "redis", "sqlalchemy"] | None,
            QueryParameter(description="Append a memory section from this preset."),
        ] = None,
        keep_refs: Annotated[
            bool,
            QueryParameter(
                description="Keep hub: references instead of inlining regexes."
            ),
        ] = False,
    ) -> Response[str]:
        registry = registry_of(state)
        snapshot = _snapshot(registry, _ref(namespace, name, selector))
        try:
            if snapshot.kind == "config":
                data = render_pipeline(
                    resolve_config(registry, snapshot),
                    keep_refs=keep_refs,
                    memory=memory,
                )
            else:
                data = render_labels_pipeline(
                    resolve_labels(registry, snapshot),
                    keep_refs=keep_refs,
                    memory=memory,
                )
        except ResolutionError as exc:
            raise UnprocessableError(str(exc)) from exc
        return Response(
            to_toml(data),
            media_type=TOML_MEDIA_TYPE,
            headers=_cache_headers(selector, snapshot),
        )


# ------------------------------------------------------------------ helpers


def _ref(namespace: str, name: str, selector: str | None = None) -> Ref:
    text = f"{namespace}/{name}" + (f":{selector}" if selector else "")
    try:
        return parse_ref(text)
    except RefError as exc:
        raise BadRequestError(str(exc)) from exc


def _snapshot(registry: Registry, ref: Ref) -> Snapshot:
    try:
        return registry.resolve(ref)
    except ResolutionError as exc:
        raise NotFoundError(str(exc)) from exc


def _cache_headers(selector: str, snapshot: Snapshot) -> dict[str, str]:
    return {
        "ETag": f'"{snapshot.digest}"',
        "Cache-Control": IMMUTABLE if is_commit(selector) else REVALIDATE,
    }


def _summary(registry: Registry, head: Snapshot) -> ObjectSummary:
    description = head.content["description"]
    return ObjectSummary(
        key=head.key,
        kind=head.kind,
        namespace=head.namespace,
        name=head.name,
        description=Localized(en=description["en"], fr=description["fr"]),
        tags=list(head.content.get("tags", [])),
        latest=head.short,
        pointers=registry.tags_of(head.key),
    )


def _resolve(registry: Registry, snapshot: Snapshot) -> Resolved:
    if snapshot.kind == "config":
        resolved = resolve_config(registry, snapshot)
        return Resolved(
            ref=resolved.ref,
            kind="config",
            labels=None,
            detectors=[
                ResolvedDetectorOut(
                    name=d.name,
                    type=str(d.spec.get("type")),
                    groups=list(d.groups),
                    labels=_labels_out(d.labels) if d.labels is not None else None,
                )
                for d in resolved.detectors
            ],
            stages=resolved.stages,
            pipeline=render_pipeline(resolved),
        )
    labels = resolve_labels(registry, snapshot)
    return Resolved(
        ref=labels.ref,
        kind=snapshot.kind,
        labels=_labels_out(labels),
        detectors=None,
        stages=None,
        pipeline=render_labels_pipeline(labels),
    )


def _labels_out(labels) -> list[ResolvedLabelOut]:
    return [
        ResolvedLabelOut(
            label=e.label, regex=e.regex, pattern=e.pattern, via=list(e.via)
        )
        for e in labels.labels.values()
    ]
