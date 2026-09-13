"""Canonical serialization and content addressing.

A commit is the sha256 of the canonical JSON of a frozen manifest: keys sorted,
no whitespace, UTF-8 kept as is. Comments and key order in the source TOML do not
change the digest, so a reformat never creates a commit. The short form is the
first eight hex characters, scoped to one object's history.
"""

import hashlib
import json
from typing import Any

SHORT_LENGTH = 8


def canonical_json(content: Any) -> bytes:
    """Serialize content deterministically."""
    return json.dumps(
        content, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


def digest_of(content: Any) -> str:
    """Return the full sha256 hex digest of content's canonical form."""
    return hashlib.sha256(canonical_json(content)).hexdigest()


def short_of(digest: str) -> str:
    """Return the eight-character commit id of a full digest."""
    return digest[:SHORT_LENGTH]
