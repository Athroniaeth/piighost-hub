"""HTTP tests for the interactive routes and the read-only additions."""

from litestar import Litestar
from litestar.testing import AsyncTestClient

TEXT = "write to john.doe@example.com about SIRET 73282932000074"


class TestSearch:
    async def test_query_matches_name_label_and_description(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        body = (await client.get("/api/v1/search", params={"q": "siret"})).json()
        assert "piighost/fr-siret" in [i["key"] for i in body["items"]]
        assert body["total"] == len(body["items"])

    async def test_tags_combine_with_and(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        one = (await client.get("/api/v1/search", params={"tag": ["finance"]})).json()
        two = (
            await client.get("/api/v1/search", params={"tag": ["finance", "fr"]})
        ).json()
        assert two["total"] < one["total"]
        assert all({"finance", "fr"} <= set(i["tags"]) for i in two["items"])

    async def test_facets_count_the_result_set(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        body = (await client.get("/api/v1/search", params={"kind": "pattern"})).json()
        counts = {f["tag"]: f["count"] for f in body["facets"]}
        assert counts["contact"] == sum(
            1 for i in body["items"] if "contact" in i["tags"]
        )
        assert all(f["kind"] for f in body["facets"])

    async def test_filtering_by_label(self, client: AsyncTestClient[Litestar]) -> None:
        body = (await client.get("/api/v1/search", params={"label": "FR_SIRET"})).json()
        assert {i["key"] for i in body["items"]} >= {"piighost/fr-siret", "piighost/fr"}

    async def test_used_by_is_reported(self, client: AsyncTestClient[Litestar]) -> None:
        body = (await client.get("/api/v1/search", params={"q": "email"})).json()
        email = next(i for i in body["items"] if i["key"] == "piighost/email")
        assert email["used_by"] == ["piighost/all"]

    async def test_sort_orders(self, client: AsyncTestClient[Litestar]) -> None:
        by_name = (await client.get("/api/v1/search", params={"sort": "name"})).json()[
            "items"
        ]
        assert [i["name"] for i in by_name] == sorted(i["name"] for i in by_name)
        by_used = (await client.get("/api/v1/search", params={"sort": "used"})).json()[
            "items"
        ]
        counts = [len(i["used_by"]) for i in by_used]
        assert counts == sorted(counts, reverse=True)
        by_labels = (
            await client.get("/api/v1/search", params={"sort": "labels"})
        ).json()["items"]
        widths = [len(i["labels"]) for i in by_labels]
        assert widths == sorted(widths, reverse=True)
        assert (
            await client.get("/api/v1/search", params={"sort": "nope"})
        ).status_code == 400

    async def test_hits_carry_history_facts(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        item = (await client.get("/api/v1/search", params={"q": "email"})).json()[
            "items"
        ][0]
        # The fixture is unrecorded: one head, no date yet.
        assert item["commits"] == 1
        assert item["updated_at"] is None

    async def test_labels_and_samples(self, client: AsyncTestClient[Litestar]) -> None:
        labels = (await client.get("/api/v1/labels")).json()["items"]
        assert {"label": "EMAIL", "patterns": ["piighost/email"]} in labels
        samples = (await client.get("/api/v1/samples")).json()["items"]
        assert samples == []


class TestPlayground:
    async def test_run_returns_hits_and_rendered_text(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/playground", json={"ref": "piighost/all", "text": TEXT}
        )
        assert response.status_code == 200
        body = response.json()
        assert (
            body["anonymized_text"] == "write to <<EMAIL:1>> about SIRET <<FR_SIRET:1>>"
        )
        assert {h["label"] for h in body["hits"] if not h["kept"]} == {"CREDIT_CARD"}

    async def test_unknown_ref_is_404_and_bad_ref_is_400(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        assert (
            await client.post(
                "/api/v1/playground", json={"ref": "piighost/nope", "text": "x"}
            )
        ).status_code == 404
        assert (
            await client.post("/api/v1/playground", json={"ref": "Nope", "text": "x"})
        ).status_code == 400

    async def test_an_oversized_text_is_refused(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/playground", json={"ref": "piighost/all", "text": "a" * 50_000}
        )
        assert response.status_code == 400
        assert "playground accepts" in response.json()["detail"]

    async def test_candidate_regex_runs_and_catastrophic_one_is_refused(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        ok = await client.post(
            "/api/v1/playground/candidate",
            json={"regex": r"\bx\d{3}\b", "label": "CODE", "text": "see x123"},
        )
        assert ok.status_code == 200
        assert ok.json()["anonymized_text"] == "see <<CODE:1>>"
        bad = await client.post(
            "/api/v1/playground/candidate",
            json={"regex": r"(a+)+b", "text": "a" * 40 + "c"},
        )
        assert bad.status_code == 422
        assert "backtracks catastrophically" in bad.json()["detail"]

    async def test_chat_keeps_one_token_per_value(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/playground/chat",
            json={
                "ref": "piighost/all",
                "messages": ["mail john.doe@example.com", "again john.doe@example.com"],
            },
        )
        body = response.json()
        assert [t["user_sent"] for t in body["turns"]] == [
            "mail <<EMAIL:1>>",
            "again <<EMAIL:1>>",
        ]
        assert body["mapping"] == {"<<EMAIL:1>>": "john.doe@example.com"}
        assert "john.doe@example.com" in body["turns"][0]["reply_text"]

    async def test_chat_refuses_too_many_messages(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/playground/chat",
            json={"ref": "piighost/all", "messages": ["x"] * 30},
        )
        assert response.status_code == 400


class TestCompare:
    async def test_agreement_and_disagreement(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/compare",
            json={"refs": ["piighost/all", "piighost/fr"], "text": TEXT},
        )
        body = response.json()
        assert body["agreed"] == ["73282932000074"]
        assert body["disputed"] == ["john.doe@example.com"]
        assert [r["ref"].split(":")[0] for r in body["runs"]] == [
            "piighost/all",
            "piighost/fr",
        ]

    async def test_needs_at_least_two_references(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/compare", json={"refs": ["piighost/all"], "text": "x"}
        )
        assert response.status_code == 400


class TestExportsAndBadges:
    async def test_json_presidio_and_spacy(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        body = (
            await client.get(
                "/api/v1/refs/piighost/all/latest/export", params={"format": "json"}
            )
        ).json()
        assert [p["label"] for p in body["patterns"]] == [
            "FR_SIRET",
            "EMAIL",
            "CREDIT_CARD",
        ]
        presidio = await client.get(
            "/api/v1/refs/piighost/all/latest/export", params={"format": "presidio"}
        )
        assert presidio.headers["content-type"].startswith("text/x-python")
        assert "PatternRecognizer(" in presidio.text
        assert "score=1.0" in presidio.text
        spacy = await client.get(
            "/api/v1/refs/piighost/all/latest/export", params={"format": "spacy"}
        )
        assert spacy.text.strip().count("\n") == 2
        assert '"label": "FR_SIRET"' in spacy.text

    async def test_a_config_cannot_be_exported_as_patterns(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.get(
            "/api/v1/refs/piighost/base/latest/export", params={"format": "json"}
        )
        assert response.status_code == 400

    async def test_snippets_and_badge(self, client: AsyncTestClient[Litestar]) -> None:
        snippets = (
            await client.get("/api/v1/refs/piighost/base/latest/snippets")
        ).json()
        assert set(snippets["items"]) == {"cli", "curl", "docker", "python"}
        assert "load_pipeline" in snippets["items"]["python"]
        badge = (await client.get("/api/v1/badge/piighost/all")).json()
        assert badge["schemaVersion"] == 1
        assert badge["message"].startswith("piighost/all:")


class TestScoreAndDiff:
    async def test_score_is_zero_without_a_corpus(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        body = (await client.get("/api/v1/refs/piighost/base/latest/score")).json()
        assert body["annotated"] == 0
        assert body["recall"] == 0.0

    async def test_diff_of_a_commit_against_itself_is_empty(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        head = (await client.get("/api/v1/refs/piighost/all")).json()["latest"]
        body = (
            await client.get(
                "/api/v1/diff/piighost/all", params={"before": head, "after": head}
            )
        ).json()
        assert body["behavioural"] is False


class TestSubmissions:
    MANIFEST = r"""
schema_version = 1

[pattern]
name = "order-id"
label = "ORDER_ID"
tags = ["contact"]
regex = '\bORD-[0-9]{6}\b'

[pattern.description]
en = "Order identifier."
fr = "Identifiant de commande."

[[examples.match]]
text = "order ORD-123456 shipped"
value = "ORD-123456"

[[examples.no_match]]
text = "ORD-12"
"""

    async def test_a_valid_submission_returns_a_pull_request_link(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/submissions/check",
            json={
                "kind": "pattern",
                "namespace": "alice",
                "name": "order-id",
                "manifest": self.MANIFEST,
            },
        )
        body = response.json()
        assert body["ok"], body["findings"]
        assert body["path"] == "patterns/alice/order-id/pattern.toml"
        assert body["pull_request_url"].startswith("https://github.com/")
        assert "filename=patterns%2Falice%2Forder-id" in body["pull_request_url"]

    async def test_a_broken_submission_reports_findings_and_no_link(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        broken = self.MANIFEST.replace('text = "ORD-12"', 'text = "ORD-123456"')
        response = await client.post(
            "/api/v1/submissions/check",
            json={
                "kind": "pattern",
                "namespace": "alice",
                "name": "order-id",
                "manifest": broken,
            },
        )
        body = response.json()
        assert not body["ok"]
        assert body["pull_request_url"] is None
        assert any("must not be detected" in f["message"] for f in body["findings"])

    async def test_the_official_namespace_is_reserved(
        self, client: AsyncTestClient[Litestar]
    ) -> None:
        response = await client.post(
            "/api/v1/submissions/check",
            json={
                "kind": "pattern",
                "namespace": "piighost",
                "name": "order-id",
                "manifest": self.MANIFEST,
            },
        )
        assert response.status_code == 422
        assert "reserved" in response.json()["detail"]
