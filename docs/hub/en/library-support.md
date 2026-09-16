# What is `piighost`'s to do

The hub publishes, checks and serves. Consuming a reference from a deployment is
the library's job, and that work lives in its repository, not here. This document
fixes the contract so the two sides can move separately.

Nothing is blocked while that support does not exist: the **flattened** export
inlines every regex, so a file downloaded today runs on `piighost` 1.7 unchanged.
`hub:` support removes the download step; it does not unlock a use.

## Resolving a reference in `catalogs`

```toml
[detector]
type = "regex"
catalogs = ["generic", "hub:alice/fr-extended:prod"]
```

`RegexDetectorConfig.catalogs` accepts four literals today. It would also accept
a string prefixed `hub:`, resolved **at construction** (`build()`) and never at
validation, so that `piighost validate` stays offline and fast. The merge does
not change: catalogues first, in order, then the inline patterns, which is
already the insertion order the hub guarantees.

## Loading a whole configuration

```python
from piighost.config import load_pipeline

pipeline = load_pipeline("hub:alice/fr-default:prod")
```

`load_config`, `load_pipeline` and `load_thread_pipeline` take a path. They would
accept a `hub:` reference, fetching
`/api/v1/refs/{ns}/{name}/{selector}/pipeline.toml` in its flattened form. A hub
configuration never carries a `[memory]` section, so `load_thread_pipeline` would
refuse it as it does today; the caller supplies their own memory, through the
`PIIGHOST_MEMORY` environment override or the programmatic path.

## Subcommands

| Command | Role |
|---|---|
| `piighost hub pull REF [-o FILE] [--keep-refs] [--memory TYPE]` | writes a pipeline TOML, flattened by default |
| `piighost hub resolve REF`, `info REF`, `search`, `tags REF`, `log REF` | inspection |
| `piighost hub lock [CONFIG]` | pins every reference to a commit and digest in `piighost.lock` |
| `piighost hub verify [CONFIG] [--offline]` | compares against the lock, exit 1 on any drift |
| `piighost hub lock --update` | re-resolves the tags, when following them is the decision |

## Resolution order, and trust

1. the lock, if there is one;
2. the local cache;
3. the network, unless `PIIGHOST_HUB_OFFLINE`.

The digest is verified whatever the source, and a mismatch raises `ConfigError`
rather than starting. A commit is immutable, so a response served by commit
caches forever; a response served by tag has to be revalidated, which the API
already announces in its headers.

| Variable | Role | Default |
|---|---|---|
| `PIIGHOST_HUB_URL` | base URL, for an internal mirror | the public instance |
| `PIIGHOST_HUB_CACHE` | cache directory | `~/.cache/piighost/hub` |
| `PIIGHOST_HUB_OFFLINE` | forbids any network call | unset |
| `PIIGHOST_HUB_TOKEN` | bearer token for a private mirror | unset |

A configuration is declarative data rather than code, but resolving one over the
network at start-up is still a dependency: the lock, the cache and the mirror
exist so that a deployment does not have one at the moment it starts.

## One limit only the library can lift

Two patterns covering the same span are settled by insertion order, since every
regex detection has a confidence of 1. That settles identical spans, not
different but overlapping ones: on `01.99.00.12.34` an IPv4 starting at the same
place but ending earlier beats the French phone, whatever the order. The hub
worked around that case by tightening its IPv4 pattern, which was correct
anyway, but the general lever, a per-pattern priority in `RegexDetector`, is on
the library's side.
