import pytest

from backend.hub.playground import (
    MAX_TEXT_LENGTH,
    PlaygroundError,
    check_text,
    deanonymize,
    render,
    run_candidate,
    run_chat,
    run_ref,
    scripted_reply,
)
from backend.hub.refs import parse_ref
from backend.hub.registry import Registry

TEXT = "card 4111 1111 1111 1111 and SIRET 73282932000074 and john.doe@example.com"


def snapshot(registry: Registry, ref: str):
    return registry.resolve(parse_ref(ref))


class TestRunning:
    async def test_a_group_detects_and_renders(self, registry: Registry) -> None:
        run = await run_ref(registry, snapshot(registry, "piighost/all"), TEXT)
        assert "<<EMAIL:1>>" in run.anonymized_text
        assert "<<FR_SIRET:1>>" in run.anonymized_text
        assert run.elapsed_ms >= 0

    async def test_losing_detections_are_reported_with_their_rival(
        self, registry: Registry
    ) -> None:
        run = await run_ref(registry, snapshot(registry, "piighost/all"), TEXT)
        siret = [h for h in run.hits if h.text == "73282932000074"]
        # Both patterns claim the same span; the resolver keeps one, and the
        # playground shows the other so a user sees why.
        assert {h.label for h in siret} == {"FR_SIRET", "CREDIT_CARD"}
        assert [h.label for h in siret if h.kept] == ["FR_SIRET"]

    async def test_provenance_names_the_pattern_commit(
        self, registry: Registry
    ) -> None:
        run = await run_ref(registry, snapshot(registry, "piighost/all"), TEXT)
        email = next(h for h in run.hits if h.label == "EMAIL")
        assert email.pattern == registry.heads["piighost/email"].ref

    async def test_a_config_reports_the_detectors_it_could_not_run(
        self, registry: Registry
    ) -> None:
        run = await run_ref(registry, snapshot(registry, "piighost/base"), TEXT)
        assert run.unsupported == ["ner"]
        assert any(h.detector == "regex-all" for h in run.hits)

    async def test_a_pattern_runs_alone(self, registry: Registry) -> None:
        run = await run_ref(registry, snapshot(registry, "piighost/email"), TEXT)
        assert [h.label for h in run.hits] == ["EMAIL"]

    def test_text_is_capped(self) -> None:
        capped, truncated = check_text("a" * (MAX_TEXT_LENGTH + 10))
        assert truncated and len(capped) == MAX_TEXT_LENGTH
        assert check_text("short") == ("short", False)

    def test_render_numbers_each_value_once_per_label(self) -> None:
        from piighost.models import Detection, Span

        detections = [
            Detection(span=Span(0, 1), text="a", label="X", confidence=1.0),
            Detection(span=Span(2, 3), text="b", label="X", confidence=1.0),
            Detection(span=Span(4, 5), text="a", label="X", confidence=1.0),
        ]
        assert render("a b a", detections) == "<<X:1>> <<X:2>> <<X:1>>"


class TestCandidate:
    async def test_a_linear_candidate_runs(self) -> None:
        run = await run_candidate(r"\bx\d{3}\b", "CODE", "see x123 here")
        assert [h.text for h in run.hits] == ["x123"]
        assert run.anonymized_text == "see <<CODE:1>> here"

    async def test_an_uncompilable_candidate_is_refused(self) -> None:
        with pytest.raises(PlaygroundError, match="does not compile"):
            await run_candidate("(", "X", "text")

    async def test_a_catastrophic_candidate_is_killed(self) -> None:
        with pytest.raises(PlaygroundError, match="backtracks catastrophically"):
            await run_candidate(r"(a+)+b", "X", "a" * 40 + "c")


class TestChat:
    async def test_a_value_keeps_its_token_across_messages(
        self, registry: Registry
    ) -> None:
        turns, mapping = await run_chat(
            registry,
            snapshot(registry, "piighost/all"),
            ["write to john.doe@example.com", "resend to john.doe@example.com please"],
        )
        assert [t.user_sent for t in turns] == [
            "write to <<EMAIL:1>>",
            "resend to <<EMAIL:1>> please",
        ]
        assert mapping == {"<<EMAIL:1>>": "john.doe@example.com"}

    async def test_the_user_reads_the_real_value_back(self, registry: Registry) -> None:
        turns, _ = await run_chat(
            registry, snapshot(registry, "piighost/all"), ["mail john.doe@example.com"]
        )
        assert "<<EMAIL:1>>" in turns[0].reply_received
        assert "john.doe@example.com" in turns[0].reply_text
        assert "<<" not in turns[0].reply_text

    def test_the_scripted_reply_quotes_every_token(self) -> None:
        assert "<<A:1>> and <<B:1>>" in scripted_reply("x <<A:1>> y <<B:1>>")
        assert "<<A:1>>," in scripted_reply("<<A:1>> <<B:1>> <<C:1>>")
        assert "personal data" in scripted_reply("nothing here")

    def test_deanonymize_leaves_unknown_tokens_alone(self) -> None:
        assert deanonymize("<<A:1>> <<B:9>>", {"<<A:1>>": "v"}) == "v <<B:9>>"
