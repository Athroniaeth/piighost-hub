"""The usage counters: what they record, and what they refuse to."""

import sqlite3
from pathlib import Path

import pytest

from backend.hub.usage import Usage, classify, client_of, report, selector_of


class TestClassify:
    @pytest.mark.parametrize(
        ("path", "expected"),
        [
            (
                "/api/v1/refs/piighost/fr-default/latest/pipeline.toml",
                ("pull", "piighost/fr-default", "latest"),
            ),
            (
                "/api/v1/refs/piighost/fr-default/3fa9c2e1/pipeline.toml",
                ("pull", "piighost/fr-default", "commit"),
            ),
            (
                "/api/v1/refs/alice/support/prod/pipeline.toml",
                ("pull", "alice/support", "tag"),
            ),
            ("/api/v1/refs/piighost/email", ("browse", "piighost/email", "")),
            ("/api/v1/refs/piighost/email/manifest", ("fork", "piighost/email", "")),
            (
                "/api/v1/refs/piighost/fr/latest/resolved",
                ("resolve", "piighost/fr", "latest"),
            ),
            ("/api/v1/search", ("search", "", "")),
            ("/api/v1/playground", ("playground", "", "")),
        ],
    )
    def test_shapes(self, path: str, expected: tuple[str, str, str]) -> None:
        assert classify(path) == expected

    def test_everything_else_is_not_counted_at_all(self) -> None:
        """Not counted and hidden, but never reaching the table."""
        for path in ("/api/health", "/sitemap.xml", "/api/v1/vocabulary", "/"):
            assert classify(path) is None


class TestClient:
    def test_three_families_and_no_raw_string(self) -> None:
        assert client_of("piighost-hub/1.7.2") == "piighost"
        assert client_of("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537") == "browser"
        assert client_of("curl/8.12.1") == "other"
        assert client_of("") == "other"

    def test_selector_families(self) -> None:
        assert selector_of("latest") == "latest"
        assert selector_of("3fa9c2e1") == "commit"
        assert selector_of("prod") == "tag"
        assert selector_of(None) == ""


class TestStore:
    async def test_identical_calls_collapse_into_one_row(self, tmp_path: Path) -> None:
        """The property that makes this a counter and not a log."""
        usage = Usage.open(tmp_path / "usage.db")
        for _ in range(5):
            usage.record(
                "/api/v1/refs/piighost/fr-default/latest/pipeline.toml",
                200,
                "piighost-hub/1.7.2",
            )
        assert await usage.flush() == 1

        with sqlite3.connect(usage.path) as db:
            rows = db.execute("SELECT object, client, count FROM usage").fetchall()
        assert rows == [("piighost/fr-default", "piighost", 5)]

    async def test_a_second_flush_adds_rather_than_replaces(
        self, tmp_path: Path
    ) -> None:
        usage = Usage.open(tmp_path / "usage.db")
        pull = "/api/v1/refs/piighost/fr-default/latest/pipeline.toml"
        usage.record(pull, 200, "piighost-hub/1.7.2")
        await usage.flush()
        usage.record(pull, 200, "piighost-hub/1.7.2")
        await usage.flush()

        with sqlite3.connect(usage.path) as db:
            assert db.execute("SELECT SUM(count) FROM usage").fetchone()[0] == 2

    async def test_an_uncounted_path_writes_nothing(self, tmp_path: Path) -> None:
        usage = Usage.open(tmp_path / "usage.db")
        usage.record("/api/health", 200, "curl/8")
        assert await usage.flush() == 0

    async def test_the_report_answers_the_question_it_was_built_for(
        self, tmp_path: Path
    ) -> None:
        usage = Usage.open(tmp_path / "usage.db")
        for _ in range(3):
            usage.record(
                "/api/v1/refs/piighost/fr-default/latest/pipeline.toml",
                200,
                "piighost-hub/1.7.2",
            )
        usage.record(
            "/api/v1/refs/piighost/us-default/3fa9c2e1/pipeline.toml",
            200,
            "piighost-hub/1.7.2",
        )
        usage.record("/api/v1/refs/piighost/email", 200, "Mozilla/5.0")
        usage.record("/api/v1/search", 200, "Mozilla/5.0")
        await usage.flush()

        out = report(usage.path, days=7)
        assert out.pulls == 4
        assert out.browses == 1
        assert out.searches == 1
        assert [row.key for row in out.top_objects] == [
            "piighost/fr-default",
            "piighost/us-default",
        ]
        assert {row.key: row.count for row in out.selectors} == {
            "latest": 3,
            "commit": 1,
        }
        assert {row.key: row.count for row in out.clients} == {"piighost": 4}
        # One entry per day of the window, gaps included.
        assert len(out.per_day) == 7
        assert out.per_day[-1].count == 4

    async def test_a_failed_call_is_counted_but_left_out_of_the_totals(
        self, tmp_path: Path
    ) -> None:
        usage = Usage.open(tmp_path / "usage.db")
        usage.record(
            "/api/v1/refs/piighost/nope/latest/pipeline.toml", 404, "piighost-hub/1.7"
        )
        await usage.flush()
        assert report(usage.path, days=7).pulls == 0

    def test_a_missing_file_reports_zero_rather_than_raising(
        self, tmp_path: Path
    ) -> None:
        out = report(tmp_path / "absent.db", days=7)
        assert out.pulls == 0
        assert len(out.per_day) == 7
