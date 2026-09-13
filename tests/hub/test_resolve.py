from pathlib import Path

import pytest

from backend.hub.errors import ResolutionError
from backend.hub.refs import parse_ref
from backend.hub.registry import Registry
from backend.hub.resolve import resolve_config, resolve_labels
from tests.hub.fixtures import write_config, write_group, write_pattern


def labels_of(registry: Registry, ref: str) -> list[str]:
    return list(resolve_labels(registry, registry.resolve(parse_ref(ref))).labels)


class TestGroups:
    def test_order_of_sources_is_order_of_labels(self, registry: Registry) -> None:
        assert labels_of(registry, "piighost/all") == [
            "FR_SIRET",
            "EMAIL",
            "CREDIT_CARD",
        ]

    def test_provenance_records_the_groups_traversed(self, registry: Registry) -> None:
        resolved = resolve_labels(registry, registry.resolve(parse_ref("piighost/all")))
        siret = resolved.labels["FR_SIRET"]
        assert siret.pattern == registry.heads["piighost/fr-siret"].ref
        assert siret.via == (
            registry.heads["piighost/all"].ref,
            registry.heads["piighost/fr"].ref,
        )

    def test_exclude_and_only_apply_per_source(self, root: Path) -> None:
        write_group(
            root,
            "trimmed",
            '\n[[sources]]\nref = "piighost/all"\nexclude = ["EMAIL"]\n',
        )
        write_group(
            root,
            "kept",
            '\n[[sources]]\nref = "piighost/all"\nonly = ["EMAIL"]\n',
        )
        registry = Registry.load(root)
        assert labels_of(registry, "piighost/trimmed") == ["FR_SIRET", "CREDIT_CARD"]
        assert labels_of(registry, "piighost/kept") == ["EMAIL"]

    def test_excluding_a_label_the_source_lacks_is_an_error(self, root: Path) -> None:
        write_group(
            root, "typo", '\n[[sources]]\nref = "piighost/fr"\nexclude = ["EMAIL"]\n'
        )
        registry = Registry.load(root)
        with pytest.raises(ResolutionError, match="provides no label EMAIL"):
            labels_of(registry, "piighost/typo")

    def test_same_label_from_two_sources_is_an_error_naming_both(
        self, root: Path
    ) -> None:
        write_pattern(root, "email-bis", "EMAIL", "x@y", matches=[("x@y", "x@y")])
        write_group(
            root,
            "clash",
            '\n[[sources]]\nref = "piighost/email"\n\n[[sources]]\nref = "piighost/email-bis"\n',
        )
        registry = Registry.load(root)
        with pytest.raises(ResolutionError) as info:
            labels_of(registry, "piighost/clash")
        assert "piighost/email:" in str(info.value)
        assert "piighost/email-bis:" in str(info.value)
        assert "exclude it from one source" in str(info.value)

    def test_diamond_over_the_same_pattern_commit_is_fine(self, root: Path) -> None:
        write_group(
            root,
            "diamond",
            '\n[[sources]]\nref = "piighost/fr"\n\n[[sources]]\nref = "piighost/all"\n',
        )
        registry = Registry.load(root)
        assert labels_of(registry, "piighost/diamond") == [
            "FR_SIRET",
            "EMAIL",
            "CREDIT_CARD",
        ]

    def test_a_pattern_is_a_group_of_one(self, registry: Registry) -> None:
        assert labels_of(registry, "piighost/email") == ["EMAIL"]

    def test_a_config_is_not_a_label_source(self, registry: Registry) -> None:
        with pytest.raises(ResolutionError, match="is a config"):
            labels_of(registry, "piighost/base")


class TestConfigs:
    def test_child_inherits_minus_exclusions_and_overrides_stages(
        self, registry: Registry
    ) -> None:
        child = resolve_config(registry, registry.resolve(parse_ref("piighost/child")))
        assert [d.name for d in child.detectors] == ["regex-all"]
        regex = child.detectors[0]
        assert regex.labels is not None
        assert list(regex.labels.labels) == ["FR_SIRET", "EMAIL"]
        assert regex.groups == [registry.heads["piighost/all"].ref]
        assert set(child.stages) == {"linker", "anonymizer", "expander"}

    def test_excluding_something_the_parent_lacks_is_an_error(self, root: Path) -> None:
        write_config(
            root,
            "c1",
            '\n[[extends]]\nref = "piighost/base"\nexclude = ["detector:nope"]\n',
        )
        write_config(
            root,
            "c2",
            '\n[[extends]]\nref = "piighost/base"\nexclude = ["label:NOPE"]\n',
        )
        write_config(
            root,
            "c3",
            '\n[[extends]]\nref = "piighost/base"\nexclude = ["stage:expander"]\n',
        )
        registry = Registry.load(root)
        for name, message in [
            ("c1", "no detector 'nope'"),
            ("c2", "provides no label NOPE"),
            ("c3", "no stage 'expander'"),
        ]:
            with pytest.raises(ResolutionError, match=message):
                resolve_config(
                    registry, registry.resolve(parse_ref(f"piighost/{name}"))
                )

    def test_emptying_a_detector_by_label_exclusion_is_an_error(
        self, root: Path
    ) -> None:
        write_config(
            root,
            "empty",
            '\n[[extends]]\nref = "piighost/base"\nexclude = ["label:FR_SIRET", "label:EMAIL", "label:CREDIT_CARD"]\n',
        )
        registry = Registry.load(root)
        with pytest.raises(ResolutionError, match="empties detector 'regex-all'"):
            resolve_config(registry, registry.resolve(parse_ref("piighost/empty")))

    def test_own_detector_may_not_shadow_an_inherited_one(self, root: Path) -> None:
        write_config(
            root,
            "shadow",
            '\n[[extends]]\nref = "piighost/base"\n\n[[detectors]]\nname = "ner"\ntype = "spacy"\nmodel = "en_core_web_sm"\n',
        )
        registry = Registry.load(root)
        with pytest.raises(ResolutionError, match="already comes from a parent"):
            resolve_config(registry, registry.resolve(parse_ref("piighost/shadow")))

    def test_two_parents_providing_the_same_detector_or_stage_is_an_error(
        self, root: Path
    ) -> None:
        write_config(
            root,
            "twins",
            '\n[[extends]]\nref = "piighost/base"\n\n[[extends]]\nref = "piighost/child"\n',
        )
        registry = Registry.load(root)
        with pytest.raises(ResolutionError, match="comes from two parents"):
            resolve_config(registry, registry.resolve(parse_ref("piighost/twins")))

    def test_regex_detector_merging_groups_applies_the_collision_rule(
        self, root: Path
    ) -> None:
        write_config(
            root,
            "merge",
            '\n[[detectors]]\nname = "rx"\ntype = "regex"\ngroups = ["piighost/fr", "piighost/all"]\n',
        )
        registry = Registry.load(root)
        # fr and all both provide FR_SIRET from the same pattern commit: a diamond.
        resolved = resolve_config(
            registry, registry.resolve(parse_ref("piighost/merge"))
        )
        labels = resolved.detectors[0].labels
        assert labels is not None
        assert list(labels.labels) == ["FR_SIRET", "EMAIL", "CREDIT_CARD"]
