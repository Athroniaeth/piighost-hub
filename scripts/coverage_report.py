#!/usr/bin/env python3
"""Map the registry's labels against the published PII inventories.

Run with the fetched vendor inventories in a directory, named by
HUB_INVENTORIES (default /tmp/research/raw). See docs/hub/coverage.md for
where each inventory comes from and what the numbers do and do not mean.

The point is not a score. It is to find which shapes several independent
vendors bothered to implement, since that is the closest thing to evidence
that a shape appears in real documents often enough to matter.

Reads the fetched inventories in /tmp/research/raw, normalises the names into
comparable tokens, and reports what the registry covers, what it is missing
ordered by how many sources carry it, and what the sources carry that no regex
can reach.
"""

from __future__ import annotations

import json
import os
import re
import tomllib
from collections import defaultdict
from pathlib import Path

RAW = Path(os.environ.get("HUB_INVENTORIES", "/tmp/research/raw"))
LABELS = sorted(
    tomllib.loads(p.read_text())["pattern"]["label"]
    for p in Path("registry/patterns").glob("*/*/pattern.toml")
)

# Words that carry no meaning when comparing one vendor's naming to another's.
NOISE = {
    "number",
    "numbers",
    "id",
    "identifier",
    "identification",
    "code",
    "no",
    "the",
    "of",
    "and",
    "individual",
    "personal",
    "national",
    "government",
}

# Country words, so a vendor's "FRANCE_PASSPORT" lines up with our "FR_PASSPORT".
COUNTRY = {
    "france": "fr",
    "french": "fr",
    "germany": "de",
    "german": "de",
    "spain": "es",
    "spanish": "es",
    "italy": "it",
    "italian": "it",
    "netherlands": "nl",
    "dutch": "nl",
    "poland": "pl",
    "polish": "pl",
    "uk": "uk",
    "united kingdom": "uk",
    "britain": "uk",
    "british": "uk",
    "usa": "us",
    "us": "us",
    "united states": "us",
    "america": "us",
    "american": "us",
    "canada": "ca",
    "canadian": "ca",
    "brazil": "br",
    "brazilian": "br",
    "india": "in",
    "indian": "in",
    "australia": "au",
    "australian": "au",
    "japan": "jp",
    "japanese": "jp",
    "korea": "kr",
    "korean": "kr",
    "mexico": "mx",
    "mexican": "mx",
    "china": "cn",
    "chinese": "cn",
    "argentina": "ar",
    "israel": "il",
    "turkey": "tr",
    "turkish": "tr",
    "portugal": "pt",
    "ireland": "ie",
    "irish": "ie",
    "singapore": "sg",
    "switzerland": "ch",
    "swiss": "ch",
    "sweden": "se",
    "swedish": "se",
    "norway": "no",
    "denmark": "dk",
    "finland": "fi",
    "belgium": "be",
    "austria": "at",
    "greece": "gr",
    "greek": "gr",
    "romania": "ro",
    "czech": "cz",
    "hungary": "hu",
    "indonesia": "id",
    "thailand": "th",
    "thai": "th",
    "vietnam": "vn",
    "philippines": "ph",
    "malaysia": "my",
    "new zealand": "nz",
    "south africa": "za",
    "nigeria": "ng",
    "egypt": "eg",
    "russia": "ru",
    "ukraine": "ua",
    "colombia": "co",
    "chile": "cl",
    "peru": "pe",
}

# The concept behind a dozen different spellings.
CONCEPT = {
    "passport": "passport",
    "driver": "driving-licence",
    "drivers": "driving-licence",
    "driving": "driving-licence",
    "licence": "driving-licence",
    "license": "driving-licence",
    "tax": "tax",
    "vat": "vat",
    "fiscal": "tax",
    "nif": "tax",
    "tin": "tax",
    "phone": "phone",
    "telephone": "phone",
    "mobile": "phone",
    "fax": "phone",
    "postal": "postal",
    "zip": "postal",
    "postcode": "postal",
    "post": "postal",
    "iban": "iban",
    "swift": "swift",
    "bic": "swift",
    "bank": "bank-account",
    "account": "bank-account",
    "routing": "bank-routing",
    "sort": "sort-code",
    "credit": "payment-card",
    "card": "payment-card",
    "debit": "payment-card",
    "cvv": "card-security",
    "pin": "card-security",
    "ssn": "social-security",
    "social": "social-security",
    "insurance": "social-security",
    "medicare": "health",
    "medicaid": "health",
    "health": "health",
    "nhs": "health",
    "patient": "health",
    "dea": "health",
    "npi": "health",
    "hpi": "health",
    "email": "email",
    "mail": "email",
    "ip": "ip",
    "ipv4": "ip",
    "ipv6": "ip",
    "mac": "mac",
    "imei": "imei",
    "imsi": "imsi",
    "vin": "vin",
    "vehicle": "vehicle",
    "registration": "registration",
    "plate": "vehicle",
    "birth": "date-of-birth",
    "date": "date",
    "age": "age",
    "name": "name",
    "firstname": "name",
    "lastname": "name",
    "surname": "name",
    "address": "address",
    "street": "address",
    "city": "address",
    "gender": "gender",
    "sex": "gender",
    "race": "race",
    "ethnic": "race",
    "religion": "religion",
    "political": "political",
    "sexual": "sexual-orientation",
    "biometric": "biometric",
    "fingerprint": "biometric",
    "dna": "biometric",
    "key": "credential",
    "token": "credential",
    "secret": "credential",
    "password": "credential",
    "credential": "credential",
    "oauth": "credential",
    "certificate": "certificate",
    "jwt": "credential",
    "crypto": "crypto-wallet",
    "bitcoin": "crypto-wallet",
    "ethereum": "crypto-wallet",
    "wallet": "crypto-wallet",
    "residence": "residence-permit",
    "permit": "residence-permit",
    "voter": "voter",
    "military": "military",
    "student": "student",
    "employee": "employee",
    "salary": "salary",
    "url": "url",
    "username": "username",
}

# Our own labels, described in the same vocabulary, so the two sides compare.
OURS = {
    "EMAIL": ("", "email"),
    "URL": ("", "url"),
    "IPV4": ("", "ip"),
    "IPV6": ("", "ip"),
    "MAC_ADDRESS": ("", "mac"),
    "CREDIT_CARD": ("", "payment-card"),
    "IBAN": ("", "iban"),
    "PHONE_INTERNATIONAL": ("", "phone"),
    "BTC_ADDRESS": ("", "crypto-wallet"),
    "ETH_ADDRESS": ("", "crypto-wallet"),
    "EU_VAT": ("eu", "vat"),
    "PRIVATE_KEY_BLOCK": ("", "credential"),
    "JWT": ("", "credential"),
    "BEARER_TOKEN": ("", "credential"),
    "OPENAI_API_KEY": ("", "credential"),
    "ANTHROPIC_API_KEY": ("", "credential"),
    "GOOGLE_API_KEY": ("", "credential"),
    "AWS_ACCESS_KEY": ("", "credential"),
    "AWS_SECRET_ACCESS_KEY": ("", "credential"),
    "AZURE_STORAGE_KEY": ("", "credential"),
    "GITHUB_TOKEN": ("", "credential"),
    "SLACK_TOKEN": ("", "credential"),
    "STRIPE_KEY": ("", "credential"),
    "SENDGRID_API_KEY": ("", "credential"),
    "TWILIO_SID": ("", "credential"),
    "NPM_TOKEN": ("", "credential"),
    "PYPI_TOKEN": ("", "credential"),
}
for label in LABELS:
    if label in OURS:
        continue
    head, _, rest = label.partition("_")
    country = head.lower() if len(head) == 2 else ""
    words = (rest or label).lower().split("_")
    concept = next((CONCEPT[w] for w in words if w in CONCEPT), "_".join(words))
    OURS[label] = (country, concept)


def tokens(name: str) -> tuple[str, str]:
    """A vendor's type name, reduced to (country, concept)."""
    text = re.sub(r"[_\-/]+", " ", name).lower()
    country = ""
    for word, code in COUNTRY.items():
        if re.search(rf"\b{re.escape(word)}\b", text):
            country = code
            text = re.sub(rf"\b{re.escape(word)}\b", " ", text)
            break
    words = [w for w in re.findall(r"[a-z0-9]+", text) if w not in NOISE]
    concept = next((CONCEPT[w] for w in words if w in CONCEPT), " ".join(words).strip())
    return country, concept


def load(path: str, key: str | None = None) -> list[str]:
    try:
        data = json.loads((RAW / path).read_text())
    except OSError, json.JSONDecodeError:
        # An inventory that was never fetched is a gap in the evidence, not an
        # error: the report says what it had and carries on with the rest.
        return []
    if isinstance(data, dict):
        data = list(data.get(key, data)) if key else list(data)
    out = []
    for item in data:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict):
            for field in ("name", "id", "displayName", "infoType", "title"):
                if isinstance(item.get(field), str):
                    out.append(item[field])
                    break
    return out


SOURCES = {
    "Google Cloud DLP": load("gcp_infotype_names.json"),
    "AWS Macie": load("macie_mdi_ids.json"),
    "Nightfall": load("nightfall_ids.json"),
    "Cloudflare DLP": load("cf_entries.json"),
    "Presidio (country)": load("presidio_country_specific.json"),
    "Presidio (generic)": load("presidio_generic.json"),
    "Purview": load("purview_sit_names.json"),
    "AI4Privacy 200k": load("ai4privacy_pii-masking-200k_labels.json"),
    "AI4Privacy 500k": load("ai4privacy_open-pii-masking-500k-ai4privacy_labels.json"),
}

# Concepts no regex can reach: they need a model, a lexicon or a checksum.
UNREACHABLE = {
    "name",
    "address",
    "age",
    "date",
    "gender",
    "race",
    "religion",
    "political",
    "sexual-orientation",
    "biometric",
    "salary",
    "username",
    "employee",
    "student",
    "military",
    "occupation",
    "nationality",
    "date-of-birth",
}

ours_concepts = defaultdict(set)
for label, (country, concept) in OURS.items():
    ours_concepts[concept].add(country)

demand: dict[tuple[str, str], set[str]] = defaultdict(set)
for source, names in SOURCES.items():
    for name in names:
        demand[tokens(name)].add(source)

print(f"registry: {len(LABELS)} labels, {len(ours_concepts)} distinct concepts\n")
print(f"{'source':22} {'types':>6}")
for source, names in SOURCES.items():
    print(f"{source:22} {len(names):6}")

covered = [
    k
    for k in demand
    if k[1] in ours_concepts and (not k[0] or k[0] in ours_concepts[k[1]])
]
concept_only = [k for k in demand if k[1] in ours_concepts and k not in covered]
missing = [k for k in demand if k[1] not in ours_concepts]
blocked = [k for k in missing if k[1] in UNREACHABLE]
reachable = [k for k in missing if k[1] not in UNREACHABLE]

print(f"\ncovered exactly, country and concept : {len(covered)}")
print(f"concept covered, another country     : {len(concept_only)}")
print(f"out of reach for any regex           : {len(blocked)}")
print(f"missing and regex-shaped             : {len(reachable)}")

print("\n=== most wanted, by how many independent sources carry it ===")
ranked = sorted(reachable, key=lambda k: (-len(demand[k]), k[0], k[1]))
for country, concept in ranked[:45]:
    sources = len(demand[(country, concept)])
    if sources < 2 or not concept:
        continue
    print(f"  {sources}x  {country or '--':3} {concept}")

print("\n=== countries the sources cover that the registry does not ===")
ours_countries = {c for c, _ in OURS.values() if c}
theirs = defaultdict(int)
for (country, _concept), sources in demand.items():
    if country and country not in ours_countries:
        theirs[country] += len(sources)
for country, weight in sorted(theirs.items(), key=lambda kv: -kv[1])[:25]:
    print(f"  {country}: {weight} mentions across sources")
