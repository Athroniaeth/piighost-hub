<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import Async from "../components/Async.svelte";
  import ObjectCard from "../components/ObjectCard.svelte";
  import Badge from "../components/ui/Badge.svelte";
  import Button from "../components/ui/Button.svelte";
  import Segmented from "../components/ui/Segmented.svelte";
  import { api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { t } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";

  type Kind = "" | "pattern" | "group" | "config";

  // The query string is the state: a filtered view is shareable, and the back
  // button undoes a filter instead of leaving the page.
  const query = $derived(router.query.get("q") ?? "");
  const kind = $derived((router.query.get("kind") ?? "") as Kind);
  const tags = $derived(router.query.getAll("tag"));
  const label = $derived(router.query.get("label") ?? "");
  const filtered = $derived(Boolean(query || kind || tags.length || label));

  const results = $derived(
    api.search({
      q: query,
      kind: kind || undefined,
      tag: tags.length > 0 ? tags : undefined,
      label: label || undefined,
    }),
  );

  let draft = $derived(query);

  // Mirrors the URL; a pick writes it back. Writable derived: it resets on
  // navigation and accepts a click in between.
  let kindDraft = $derived(kind);
  $effect(() => {
    if (kindDraft !== kind) update((params) => params.set("kind", kindDraft));
  });

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

  const kinds = $derived([
    { value: "" as Kind, label: t("home.all") },
    { value: "pattern" as Kind, label: t("home.patterns") },
    { value: "group" as Kind, label: t("home.groups") },
    { value: "config" as Kind, label: t("home.configs") },
  ]);
</script>

<section class="relative overflow-hidden border-b">
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,var(--primary)/12%,transparent)]"
  ></div>
  <div class="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
    <h1
      class="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl"
    >
      {t("home.title")}
    </h1>
    <p class="mt-5 max-w-2xl text-lg text-muted-foreground">{t("home.lede")}</p>
    <form
      role="search"
      class="mt-8 flex max-w-xl items-center gap-2"
      onsubmit={(event) => {
        event.preventDefault();
        update((params) => params.set("q", draft));
      }}
    >
      <label class="relative flex-1">
        <Search
          class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          bind:value={draft}
          placeholder={t("home.search")}
          aria-label={t("home.search")}
          class="h-11 w-full rounded-lg border bg-background ps-9 pe-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
    </form>
  </div>
</section>

<section id="catalogue" class="mx-auto max-w-6xl px-4 py-8">
  <Async promise={results}>
    {#snippet children(result)}
      <div class="flex flex-wrap items-center gap-3">
        <Segmented
          options={kinds}
          bind:value={kindDraft}
          label={t("home.all")}
          size="default"
        />
        <p class="text-sm text-muted-foreground">
          <span class="font-medium text-foreground tabular-nums"
            >{result.total}</span
          >
          {t("home.results")}
        </p>
        {#if filtered}
          <Button variant="ghost" size="sm" href="/">{t("home.clear")}</Button>
        {/if}
        {#if label}
          <Badge variant="outline" class="font-mono">{label}</Badge>
        {/if}
      </div>

      {#if result.facets.length > 0}
        <div class="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Tags">
          {#each result.facets as facet (facet.tag)}
            {@const pressed = tags.includes(facet.tag)}
            <button
              type="button"
              aria-pressed={pressed}
              class={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                pressed
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onclick={() => toggleTag(facet.tag)}
            >
              {facet.tag}
              <span class="tabular-nums opacity-70">{facet.count}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if result.items.length === 0}
        <p class="mt-10 text-sm text-muted-foreground">{t("home.empty")}</p>
      {:else}
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each result.items as item (item.key)}
            <ObjectCard {item} />
          {/each}
        </div>
      {/if}
    {/snippet}
  </Async>
</section>
