"""Render resolved objects into piighost pipeline files.

The flattened form inlines every regex, so the file works offline and on any
piighost version that accepts the sections it carries. The referenced form keeps
``hub:`` entries in ``catalogs`` for a piighost that resolves them itself. Memory
is never part of a shared config: it is appended on request from a preset.
"""

import json
import re
from typing import Any

from pydantic import ValidationError

from backend.hub.errors import ResolutionError
from backend.hub.resolve import ResolvedConfig, ResolvedLabels

MEMORY_PRESETS: dict[str, dict[str, Any]] = {
    "in_memory": {"type": "in_memory"},
    "redis": {
        "type": "redis",
        "url": "redis://localhost:6379/0",
        "namespace": "piighost",
        "hasher": {"type": "argon2"},
        "cipher": {"type": "aesgcm"},
    },
    "sqlalchemy": {
        "type": "sqlalchemy",
        "url_env": "PIIGHOST_DATABASE_URL",
        "hasher": {"type": "argon2"},
        "cipher": {"type": "aesgcm"},
    },
}


def render_pipeline(
    resolved: ResolvedConfig, *, keep_refs: bool = False, memory: str | None = None
) -> dict[str, Any]:
    """Return the piighost config of a resolved config, as a plain mapping."""
    detectors = [
        _render_detector(d.spec, d.labels, d.groups, keep_refs)
        for d in resolved.detectors
    ]
    if not detectors:
        raise ResolutionError(f"{resolved.ref} has no detector left to render")
    data: dict[str, Any] = {"name": resolved.ref}
    data["detector"] = (
        detectors[0]
        if len(detectors) == 1
        else {
            "type": "composite",
            "detectors": detectors,
        }
    )
    data.update(resolved.stages)
    _append_memory(data, memory)
    return data


def render_labels_pipeline(
    labels: ResolvedLabels, *, keep_refs: bool = False, memory: str | None = None
) -> dict[str, Any]:
    """Return a regex-only pipeline for a group or a pattern."""
    data: dict[str, Any] = {
        "name": labels.ref,
        "detector": _render_detector(
            {"type": "regex"}, labels, [labels.ref], keep_refs
        ),
    }
    _append_memory(data, memory)
    return data


def _render_detector(
    spec: dict[str, Any],
    labels: ResolvedLabels | None,
    groups: list[str],
    keep_refs: bool,
) -> dict[str, Any]:
    detector = dict(spec)
    if labels is None:
        return detector
    if keep_refs:
        detector["catalogs"] = [f"hub:{group}" for group in groups]
    else:
        detector["patterns"] = labels.regexes()
    return detector


def _append_memory(data: dict[str, Any], memory: str | None) -> None:
    if memory is None:
        return
    preset = MEMORY_PRESETS.get(memory)
    if preset is None:
        raise ResolutionError(
            f"unknown memory preset {memory!r}; choose among {sorted(MEMORY_PRESETS)}"
        )
    data["memory"] = json.loads(json.dumps(preset))


def validate_pipeline(data: dict[str, Any]) -> None:
    """Have the installed piighost validate a rendered pipeline, building nothing.

    Raises:
        ResolutionError: If piighost rejects the mapping.
    """
    from piighost.config import PipelineConfig

    try:
        PipelineConfig.model_validate(data)
    except ValidationError as exc:
        raise ResolutionError(f"piighost rejects the rendered pipeline: {exc}") from exc


# ------------------------------------------------------------------ TOML writer

_BARE_KEY = re.compile(r"^[A-Za-z0-9_-]+$")


def to_toml(data: dict[str, Any]) -> str:
    """Serialize a pipeline mapping to TOML.

    Regexes are written as literal strings whenever possible, so backslashes
    stay single and the file reads like the pattern itself; a regex holding a
    quote falls back to a basic string with escapes.
    """
    lines: list[str] = []
    _emit_table(lines, [], data)
    return "\n".join(lines).rstrip("\n") + "\n"


def _emit_table(lines: list[str], path: list[str], table: dict[str, Any]) -> None:
    scalars = {
        k: v for k, v in table.items() if not _is_table(v) and not _is_table_array(v)
    }
    for key, value in scalars.items():
        lines.append(f"{_key(key)} = {_value(value)}")
    for key, value in table.items():
        if _is_table(value):
            # A table holding only sub-tables needs no header of its own: TOML
            # creates it implicitly when [a.b] appears.
            has_scalars = any(
                not _is_table(v) and not _is_table_array(v) for v in value.values()
            )
            if has_scalars or not value:
                if lines and lines[-1] != "":
                    lines.append("")
                lines.append(f"[{'.'.join(_key(p) for p in [*path, key])}]")
            _emit_table(lines, [*path, key], value)
        elif _is_table_array(value):
            for item in value:
                if lines and lines[-1] != "":
                    lines.append("")
                lines.append(f"[[{'.'.join(_key(p) for p in [*path, key])}]]")
                _emit_table(lines, [*path, key], item)


def _is_table(value: Any) -> bool:
    return isinstance(value, dict)


def _is_table_array(value: Any) -> bool:
    return (
        isinstance(value, list)
        and bool(value)
        and all(isinstance(v, dict) for v in value)
    )


def _key(key: str) -> str:
    return key if _BARE_KEY.fullmatch(key) else json.dumps(key, ensure_ascii=False)


def _value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        if "'" not in value and not any(ord(c) < 0x20 for c in value):
            return f"'{value}'"
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ", ".join(_value(v) for v in value) + "]"
    if value is None:
        raise ResolutionError("TOML has no null; drop the key instead")
    raise ResolutionError(f"cannot render {type(value).__name__} to TOML")
