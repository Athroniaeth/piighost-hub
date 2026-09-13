"""The commit store: recorded, immutable snapshots of every published object.

Layout: ``<registry>/commits/<namespace>/<name>/<short>.json``. Each file holds
the frozen content, its full digest and the time it was recorded. The store is
append-only by contract: ``verify`` recomputes every digest and fails on any file
whose content no longer matches its name, which is how a rewritten commit is
caught. History lives in these files, not in git, so an ingestion needs no
``git log`` and a mirror is a plain copy.
"""

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from backend.hub.canonical import digest_of, short_of
from backend.hub.errors import StoreError

Kind = Literal["pattern", "group", "config"]
COMMITS_DIR = "commits"


@dataclass(frozen=True, slots=True)
class Snapshot:
    """A frozen object: its content, digest and, once recorded, its timestamp."""

    kind: Kind
    namespace: str
    name: str
    content: dict[str, Any]
    digest: str
    recorded_at: str | None = None

    @property
    def key(self) -> str:
        return f"{self.namespace}/{self.name}"

    @property
    def short(self) -> str:
        return short_of(self.digest)

    @property
    def ref(self) -> str:
        return f"{self.key}:{self.short}"

    @classmethod
    def freeze(cls, content: dict[str, Any]) -> Snapshot:
        """Build an unrecorded snapshot from frozen content."""
        return cls(
            kind=content["kind"],
            namespace=content["namespace"],
            name=content["name"],
            content=content,
            digest=digest_of(content),
        )


class CommitStore:
    """Reads and appends snapshots under ``<registry>/commits``."""

    def __init__(self, root: Path) -> None:
        self.root = root / COMMITS_DIR
        self._cache: dict[tuple[str, str], Snapshot] = {}

    def path_of(self, key: str, short: str) -> Path:
        return self.root / key / f"{short}.json"

    def history(self, key: str) -> list[Snapshot]:
        """Return an object's recorded snapshots, newest first."""
        directory = self.root / key
        if not directory.is_dir():
            return []
        snapshots = [self._read(path) for path in sorted(directory.glob("*.json"))]
        return sorted(snapshots, key=lambda s: s.recorded_at or "", reverse=True)

    def get(self, key: str, short: str) -> Snapshot | None:
        """Return a recorded snapshot, or None when it was never recorded."""
        cached = self._cache.get((key, short))
        if cached is not None:
            return cached
        path = self.path_of(key, short)
        if not path.is_file():
            return None
        return self._read(path)

    def has(self, snapshot: Snapshot) -> bool:
        return self.path_of(snapshot.key, snapshot.short).is_file()

    def record(self, snapshot: Snapshot) -> Snapshot:
        """Append a snapshot; recording an existing one is a no-op."""
        existing = self.get(snapshot.key, snapshot.short)
        if existing is not None:
            return existing
        recorded = Snapshot(
            kind=snapshot.kind,
            namespace=snapshot.namespace,
            name=snapshot.name,
            content=snapshot.content,
            digest=snapshot.digest,
            recorded_at=datetime.now(UTC).replace(microsecond=0).isoformat(),
        )
        path = self.path_of(recorded.key, recorded.short)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "digest": recorded.digest,
            "recorded_at": recorded.recorded_at,
            "content": recorded.content,
        }
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
        self._cache[(recorded.key, recorded.short)] = recorded
        return recorded

    def verify(self) -> list[str]:
        """Recompute every digest; return one message per corrupted snapshot."""
        problems: list[str] = []
        if not self.root.is_dir():
            return problems
        for path in sorted(self.root.glob("*/*/*.json")):
            try:
                self._read(path)
            except StoreError as exc:
                problems.append(str(exc))
        return problems

    def _read(self, path: Path) -> Snapshot:
        try:
            payload = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            raise StoreError(f"{path}: unreadable snapshot: {exc}") from exc
        content = payload.get("content")
        if not isinstance(content, dict):
            raise StoreError(f"{path}: snapshot has no content")
        digest = digest_of(content)
        if digest != payload.get("digest") or path.stem != short_of(digest):
            raise StoreError(
                f"{path}: digest mismatch, a recorded commit was modified "
                f"(expected {short_of(digest)})"
            )
        snapshot = Snapshot(
            kind=content["kind"],
            namespace=content["namespace"],
            name=content["name"],
            content=content,
            digest=digest,
            recorded_at=payload.get("recorded_at"),
        )
        self._cache[(snapshot.key, snapshot.short)] = snapshot
        return snapshot
