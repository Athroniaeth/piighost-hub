import json
import tomllib
from pathlib import Path

import pytest

from backend.hub.cli import main


def run(root: Path, *args: str) -> int:
    return main(["--registry", str(root), *args])


class TestCommands:
    def test_check_fails_then_record_then_check_passes(
        self, root: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        assert run(root, "check", "--no-redos") == 1
        assert "not recorded" in capsys.readouterr().out
        assert run(root, "record", "--no-redos") == 0
        out = capsys.readouterr().out
        assert out.count("recorded piighost/") == 7
        assert sorted(p.name for p in (root / "commits/piighost").iterdir()) == [
            "all",
            "base",
            "child",
            "credit-card",
            "email",
            "fr",
            "fr-siret",
        ]
        assert run(root, "check", "--no-redos") == 0
        assert "OK: 7 objects" in capsys.readouterr().out

    def test_resolve_and_render(
        self, root: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        assert run(root, "resolve", "piighost/all") == 0
        out = capsys.readouterr().out
        assert out.splitlines()[1].split()[0] == "FR_SIRET"
        assert run(root, "resolve", "piighost/child", "--json") == 0
        payload = json.loads(capsys.readouterr().out)
        assert [d["name"] for d in payload["detectors"]] == ["regex-all"]
        assert run(root, "render", "piighost/child", "--memory", "in_memory") == 0
        data = tomllib.loads(capsys.readouterr().out)
        assert data["memory"] == {"type": "in_memory"}
        assert run(root, "render", "piighost/fr", "--json") == 0
        assert json.loads(capsys.readouterr().out)["detector"]["type"] == "regex"

    def test_log_and_tags(self, root: Path, capsys: pytest.CaptureFixture[str]) -> None:
        assert run(root, "record", "--no-redos") == 0
        capsys.readouterr()
        assert run(root, "log", "piighost/fr") == 0
        assert len(capsys.readouterr().out.strip().splitlines()) == 1
        assert run(root, "tags", "piighost/fr") == 0
        assert capsys.readouterr().out.startswith("latest")

    def test_errors_are_reported_not_raised(
        self, root: Path, capsys: pytest.CaptureFixture[str]
    ) -> None:
        assert run(root, "resolve", "piighost/nope") == 1
        assert "unknown object" in capsys.readouterr().err
