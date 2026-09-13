<script lang="ts">
  import Async from "../components/Async.svelte";
  import ObjectCard from "../components/ObjectCard.svelte";
  import TagChip from "../components/TagChip.svelte";
  import { api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";

  type Kind = "pattern" | "group" | "config";

  const KINDS: { value: Kind | ""; key: Parameters<typeof t>[0] }[] = [
    { value: "", key: "browse.kind.all" },
    { value: "pattern", key: "browse.kind.pattern" },
    { value: "group", key: "browse.kind.group" },
    { value: "config", key: "browse.kind.config" },
  ];

  // The query string is the state: a filtered view has to be shareable, and the
  // back button has to undo a filter rather than leave the page.
  const query = $derived(router.query.get("q") ?? "");
  const kind = $derived((router.query.get("kind") ?? "") as Kind | "");
  const tags = $derived(router.query.getAll("tag"));
  const label = $derived(router.query.get("label") ?? "");

  const results = $derived(
    api.search({
      q: query,
      kind: kind || undefined,
      tag: tags.length > 0 ? tags : undefined,
      label: label || undefined,
    }),
  );

  // Writable: it follows the query string, and typing overwrites it until the
  // next navigation resets it.
  let draft = $derived(query);

  function update(mutate: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(router.query);
    mutate(next);
    router.setQuery(next, { replace: true });
  }

  function toggleTag(tag: string) {
    update((params) => {
      const current = params.getAll("tag");
      params.delete("tag");
      for (const value of current)
        if (value !== tag) params.append("tag", value);
      if (!current.includes(tag)) params.append("tag", tag);
    });
  }
</script>

<div class="mx-auto max-w-6xl px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("browse.title")}</h1>

  <form
    class="mt-5 flex flex-wrap gap-2"
    onsubmit={(event) => {
      event.preventDefault();
      update((params) => params.set("q", draft));
    }}
    role="search"
  >
    <input
      type="search"
      bind:value={draft}
      placeholder={t("home.search")}
      aria-label={t("home.search")}
      class="hairline min-w-56 flex-1 rounded-md border bg-[var(--page)] px-3 py-2 text-sm"
    />
    <select
      class="hairline rounded-md border bg-[var(--page)] px-3 py-2 text-sm"
      aria-label={t("browse.kind.all")}
      value={kind}
      onchange={(event) =>
        update((params) =>
          params.set("kind", (event.target as HTMLSelectElement).value),
        )}
    >
      {#each KINDS as option (option.value)}
        <option value={option.value}>{t(option.key)}</option>
      {/each}
    </select>
    {#if query || kind || tags.length > 0 || label}
      <a href="/browse" class="hairline rounded-md border px-3 py-2 text-sm">
        {t("browse.clear")}
      </a>
    {/if}
  </form>

  {#if label}
    <p class="muted mt-3 text-sm">
      <code class="font-mono">{label}</code>
    </p>
  {/if}

  <Async promise={results}>
    {#snippet children(result)}
      <p class="muted mt-5 text-sm">{result.total} {t("browse.results")}</p>

      {#if result.facets.length > 0}
        <ul class="mt-3 flex flex-wrap gap-1.5">
          {#each result.facets as facet (facet.tag)}
            <li>
              <TagChip
                tag={facet.tag}
                kind={facet.kind}
                count={facet.count}
                pressed={tags.includes(facet.tag)}
                onclick={() => toggleTag(facet.tag)}
              />
            </li>
          {/each}
        </ul>
      {/if}

      {#if result.items.length === 0}
        <p class="muted mt-8 text-sm">{t("browse.empty")}</p>
      {:else}
        <ul class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each result.items as item (item.key)}
            <ObjectCard {item} />
          {/each}
        </ul>
      {/if}
    {/snippet}
  </Async>
</div>
