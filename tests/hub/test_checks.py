import json
from pathlib import Path

import pytest

from backend.hub import checks
from backend.hub.checks import check_registry
from backend.hub.registry import Registry
from tests.hub.fixtures import (
    CARD,
    write,
    write_config,
    write_group,
    write_pattern,
)


def errors(report: checks.Report) -> list[str]:
    return [f"{f.subject}: {f.message}" for f in report.errors]


class TestPatterns:
    def test_fixture_passes_once_recorded(self, registry: Registry) -> None:
        for head in registry.heads.values():
            registry.store.record(head)
        report = check_registry(registry, redos=False)
        assert report.ok, errors(report)

    def test_unrecorded_heads_fail_unless_allowed(self, registry: Registry) -> None:
        assert not check_registry(registry, redos=False).ok
        assert check_registry(registry, redos=False, require_recorded=False).ok

    def test_a_match_example_that_does_not_match(self, root: Path) -> None:
        write_pattern(
            root, "broken", "BROKEN", "abc", matches=[("see abd here", "abd")]
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert any(
            "'abd' from piighost/broken" in e and "covered by nothing" in e
            for e in errors(report)
        )

    def test_a_no_match_example_that_matches(self, root: Path) -> None:
        write_pattern(
            root,
            "loose",
            "LOOSE",
            "abc",
            matches=[("abc", "abc")],
            no_matches=["xabcx"],
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert any("must not be detected as LOOSE" in e for e in errors(report))

    def test_resilience_catches_swallowed_punctuation(self, root: Path) -> None:
        # A URL-like tail that eats the sentence's final dot.
        write_pattern(
            root,
            "greedy",
            "GREEDY",
            r"https?://\S+",
            matches=[("see https://example.com now", "https://example.com")],
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert any("wrapped as '{v}.'" in e for e in errors(report))

    def test_resilience_can_be_opted_out(self, root: Path) -> None:
        write_pattern(
            root,
            "greedy",
            "GREEDY",
            r"https?://\S+",
            matches=[("see https://example.com now", "https://example.com")],
            extra="resilience = false",
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert report.ok, errors(report)


class TestComposition:
    def test_order_decides_on_an_identical_span(self, root: Path) -> None:
        # generic first: the 14-digit SIRET is captured as a card number.
        write_group(
            root,
            "generic-first",
            '\n[[sources]]\nref = "piighost/credit-card"\n\n[[sources]]\nref = "piighost/fr-siret"\n',
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        bad = [e for e in errors(report) if "generic-first" in e]
        assert len(bad) == 1
        assert "'73282932000074' from piighost/fr-siret" in bad[0]
        assert "CREDIT_CARD='73282932000074'" in bad[0]
        # The fixture's `all` group lists fr first and passes.
        assert not [e for e in errors(report) if "piighost/all:" in e]

    def test_no_match_at_composition_level_only_concerns_the_pattern_label(
        self, root: Path
    ) -> None:
        # 13 digits is not a SIRET but is a card number: fine, another label may take it.
        registry = Registry.load(root)
        report = check_registry(registry, redos=False, require_recorded=False)
        assert report.ok, errors(report)

    def test_config_replays_examples_through_its_regex_detectors(
        self, root: Path
    ) -> None:
        write_config(
            root,
            "swapped",
            '\n[[detectors]]\nname = "cards"\ntype = "regex"\ngroups = ["piighost/credit-card"]\n\n[[detectors]]\nname = "fr"\ntype = "regex"\ngroups = ["piighost/fr"]\n',
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert any(
            "piighost/swapped:" in e and "from piighost/fr-siret" in e
            for e in errors(report)
        )


class TestBacktracking:
    def test_a_quadratic_scan_blows_the_budget(
        self, root: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(checks, "REDOS_BUDGET_SECONDS", 0.0)
        monkeypatch.setattr(checks, "REDOS_TEXT_LENGTH", 2_000)
        write_pattern(
            root,
            "slow",
            "SLOW",
            CARD,
            matches=[("4111 1111 1111 1111", "4111 1111 1111 1111")],
        )
        report = check_registry(Registry.load(root), require_recorded=False)
        assert any("piighost/slow" in e and "not linear" in e for e in errors(report))

    def test_a_hung_scan_is_killed(
        self, root: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(checks, "REDOS_TIMEOUT_SECONDS", 0.5)
        monkeypatch.setattr(checks, "REDOS_TEXT_LENGTH", 5_000)
        write_pattern(
            root,
            "exp",
            "EXP",
            r"(a+)+b",
            matches=[("aab", "aab")],
            no_matches=["c"],
            tail='\n[redos]\nprefix = ""\nfiller = "a"\nsuffix = "c"\n',
        )
        report = check_registry(Registry.load(root), require_recorded=False)
        assert any(
            "piighost/exp" in e and "catastrophic backtracking" in e
            for e in errors(report)
        )

    def test_linear_patterns_pass_the_default_recipes(
        self, root: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(checks, "REDOS_TEXT_LENGTH", 20_000)
        report = check_registry(Registry.load(root), require_recorded=False)
        assert report.ok, errors(report)


class TestStoreAndTags:
    def test_a_modified_commit_is_detected(self, registry: Registry) -> None:
        head = registry.heads["piighost/email"]
        recorded = registry.store.record(head)
        path = registry.store.path_of(recorded.key, recorded.short)
        payload = json.loads(path.read_text())
        payload["content"]["regex"] = "tampered"
        path.write_text(json.dumps(payload))
        registry.store._cache.clear()
        report = check_registry(registry, redos=False, require_recorded=False)
        assert any("digest mismatch" in e for e in errors(report))

    def test_a_tag_pointing_nowhere(self, root: Path) -> None:
        write(root / "patterns/piighost/email/tags.toml", 'prod = "00000000"\n')
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert any(
            "piighost/email:prod: points at unknown commit 00000000" in e
            for e in errors(report)
        )

    def test_piighost_specifier(self, root: Path) -> None:
        write_config(
            root,
            "old",
            '\n[[detectors]]\nname = "rx"\ntype = "regex"\ngroups = ["piighost/fr"]\n',
        )
        path = root / "configs/piighost/old/config.toml"
        path.write_text(
            path.read_text().replace('piighost = ">=1.0"', 'piighost = "<0.1"')
        )
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert any(
            "piighost/old:" in e and "declares piighost '<0.1'" in e
            for e in errors(report)
        )

    def test_missing_specifier_is_a_warning(self, root: Path) -> None:
        write_config(
            root,
            "nospec",
            '\n[[detectors]]\nname = "rx"\ntype = "regex"\ngroups = ["piighost/fr"]\n',
        )
        path = root / "configs/piighost/nospec/config.toml"
        path.write_text(path.read_text().replace('piighost = ">=1.0"\n', ""))
        report = check_registry(
            Registry.load(root), redos=False, require_recorded=False
        )
        assert report.ok, errors(report)
        assert any(
            f.level == "warning" and "no piighost version range" in f.message
            for f in report.findings
        )
