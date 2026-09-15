from pathlib import Path

import pytest

from backend.hub.errors import ResolutionError
from backend.hub.evaluate import diff_commits
from backend.hub.registry import Registry
from backend.hub.samples import load_samples
from tests.hub.fixtures import EMAIL, write, write_pattern

SAMPLE = """
schema_version = 1

[sample]
name = "one"
title = { en = "One", fr = "Un" }
tags = ["contact"]
text = "write to john.doe@example.com about SIRET 73282932000074"

[[annotations]]
value = "john.doe@example.com"
label = "EMAIL"

[[annotations]]
value = "73282932000074"
label = "FR_SIRET"
"""


@pytest.fixture
def with_sample(root: Path) -> Registry:
    write(root / "samples/one/sample.toml", SAMPLE)
    return Registry.load(root)


class TestSamples:
    def test_a_sample_is_loaded_and_its_spans_found(
        self, with_sample: Registry
    ) -> None:
        sample = with_sample.samples["one"]
        assert [label for _, _, label in sample.spans()] == ["EMAIL", "FR_SIRET"]

    def test_an_annotation_absent_from_the_text_is_refused(self, root: Path) -> None:
        # Only the annotation changes; the text keeps the value it no longer names.
        broken = SAMPLE.replace('value = "73282932000074"', 'value = "nope"')
        write(root / "samples/one/sample.toml", broken)
        problems: list[str] = []
        load_samples(root, {"contact"}, problems)
        assert any("does not appear in the text" in p for p in problems)

    def test_an_unknown_tag_is_refused(self, root: Path) -> None:
        write(
            root / "samples/one/sample.toml", SAMPLE.replace('["contact"]', '["nope"]')
        )
        problems: list[str] = []
        load_samples(root, {"contact"}, problems)
        assert any("unknown tag 'nope'" in p for p in problems)


class TestDiff:
    async def test_widening_a_pattern_shows_as_a_changed_value(
        self, with_sample: Registry, root: Path
    ) -> None:
        before = with_sample.heads["piighost/all"]
        with_sample.store.record(with_sample.heads["piighost/email"])
        with_sample.store.record(before)
        write_pattern(
            root,
            "email",
            "EMAIL",
            # Four-letter TLDs only, so example.com stops matching.
            EMAIL.replace("[A-Za-z]{2,}", "[A-Za-z]{4,}"),
            matches=[("a@b.info", "a@b.info")],
            no_matches=["nope"],
        )
        after_registry = Registry.load(root)
        after = after_registry.heads["piighost/all"]
        diff = await diff_commits(
            after_registry, before, after, list(after_registry.samples.values())
        )
        assert diff.behavioural
        assert diff.labels_added == [] and diff.labels_removed == []
        assert [(c.text, c.before, c.after) for c in diff.changes] == [
            ("john.doe@example.com", "EMAIL", None)
        ]

    async def test_a_comment_only_edit_changes_nothing(
        self, with_sample: Registry
    ) -> None:
        head = with_sample.heads["piighost/all"]
        diff = await diff_commits(
            with_sample, head, head, list(with_sample.samples.values())
        )
        assert not diff.behavioural
        assert diff.changes == []

    async def test_two_different_objects_cannot_be_diffed(
        self, with_sample: Registry
    ) -> None:
        with pytest.raises(ResolutionError, match="different objects"):
            await diff_commits(
                with_sample,
                with_sample.heads["piighost/all"],
                with_sample.heads["piighost/fr"],
                [],
            )
