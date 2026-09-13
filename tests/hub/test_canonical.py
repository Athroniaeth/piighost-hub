from backend.hub.canonical import canonical_json, digest_of, short_of


def test_key_order_does_not_matter() -> None:
    assert digest_of({"a": 1, "b": [1, 2]}) == digest_of({"b": [1, 2], "a": 1})


def test_short_is_eight_hex_characters() -> None:
    short = short_of(digest_of({"x": "é"}))
    assert len(short) == 8
    assert int(short, 16) >= 0


def test_canonical_form_is_compact_and_keeps_unicode() -> None:
    assert canonical_json({"b": "é", "a": True}) == b'{"a":true,"b":"\xc3\xa9"}'
