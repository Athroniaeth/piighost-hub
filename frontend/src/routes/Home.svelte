<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import Async from "../components/Async.svelte";
  import FacetSection from "../components/FacetSection.svelte";
  import ObjectRow from "../components/ObjectRow.svelte";
  import Badge from "../components/ui/Badge.svelte";
  import Button from "../components/ui/Button.svelte";
  import type { SearchOut } from "../generated/api";
  import { api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { t, type Key } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  type Kind = "pattern" | "group" | "config";
  type Sort = "relevance" | "updated" | "used" | "labels" | "name";

  const PER_PAGE = 15;
  const KINDS: Kind[] = ["pattern", "group", "config"];
  const SORTS: Sort[] = ["relevance", "updated", "used", "labels", "name"];
  const FACET_ORDER = ["region", "category", "domain", "use-case", "language"];

  // The query string is the state: a filtered view is shareable, and the back
  // button undoes a filter instead of leaving the page.
  const query = $derived(router.query.get("q") ?? "");
  const kind = $derived((router.query.get("kind") ?? "") as Kind | "");
  const tags = $derived(router.query.getAll("tag"));
  const label = $derived(router.query.get("label") ?? "");
  const sort = $derived(
    (router.query.get("sort") ?? (query ? "relevance" : "updated")) as Sort,
  );
  const page = $derived(
    Math.max(1, Number(router.query.get("page") ?? "1") || 1),
  );
  const filtered = $derived(Boolean(query || kind || tags.length || label));

  const results = $derived(
    api.search({
      q: query,
      kind: kind || undefined,
      tag: tags.length > 0 ? tags : undefined,
      label: label || undefined,
      sort,
    }),
  );

  let draft = $derived(query);

  function update(
    mutate: (params: URLSearchParams) => void,
    { keepPage = false } = {},
  ) {
    const next = new SvelteURLSearchParams(router.query);
    mutate(next);
    if (!keepPage) next.delete("page");
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

  /** One kind at a time; picking the active one clears the filter. */
  function toggleKind(value: string) {
    update((params) => params.set("kind", kind === value ? "" : value));
  }

  function facetGroups(result: SearchOut) {
    return FACET_ORDER.map((group) => ({
      group,
      rows: result.facets
        .filter((facet) => facet.kind === group)
        .map((facet) => ({ value: facet.tag, count: facet.count })),
    })).filter((section) => section.rows.length > 0);
  }

  function kindRows(result: SearchOut) {
    return KINDS.map((value) => ({
      value,
      label: t(`kind.${value}` as Key),
      count: result.items.filter((item) => item.kind === value).length,
    }));
  }

  function pageOf(result: SearchOut) {
    const pages = Math.max(1, Math.ceil(result.items.length / PER_PAGE));
    const current = Math.min(page, pages);
    return {
      pages,
      current,
      items: result.items.slice((current - 1) * PER_PAGE, current * PER_PAGE),
    };
  }
</script>

<section class="border-b">
  <div class="mx-auto max-w-3xl px-4 pt-14 pb-10 text-center">
    <h1 class="font-mono text-4xl font-semibold tracking-tight">
      {t("home.title")}
    </h1>
    <!-- Balanced: the French line is long enough that the browser otherwise
         drops its last word alone on a third line. -->
    <p class="mx-auto mt-3 max-w-xl text-lg text-balance text-muted-foreground">
      {t("home.lede")}
    </p>
    <form
      role="search"
      class="mt-7"
      onsubmit={(event) => {
        event.preventDefault();
        update((params) => params.set("q", draft));
      }}
    >
      <label class="relative block">
        <input
          type="search"
          bind:value={draft}
          placeholder={t("home.search")}
          aria-label={t("home.search")}
          class="h-14 w-full rounded-full border bg-background ps-6 pe-14 text-base shadow-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          aria-label={t("home.search")}
          class="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Search class="size-5" />
        </button>
      </label>
    </form>
  </div>
</section>

<section class="mx-auto max-w-7xl px-4 py-8">
  <Async promise={results}>
    {#snippet children(result)}
      {@const paged = pageOf(result)}
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={t("home.sort")}
              class="flex flex-wrap gap-1.5"
            >
              {#each SORTS as option (option)}
                <button
                  type="button"
                  aria-pressed={sort === option}
                  class={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    sort === option
                      ? "border-transparent bg-muted font-medium text-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                  onclick={() => update((params) => params.set("sort", option))}
                >
                  {t(`home.sort.${option}` as Key)}
                </button>
              {/each}
            </div>
            <p class="ms-auto text-sm text-muted-foreground">
              <span class="font-medium text-foreground tabular-nums"
                >{result.total}</span
              >
              {t("home.results")}
            </p>
            {#if filtered}
              <Button variant="ghost" size="sm" href="/"
                >{t("home.clear")}</Button
              >
            {/if}
          </div>

          {#if label}
            <p class="mt-3 text-sm text-muted-foreground">
              <Badge variant="outline" class="font-mono">{label}</Badge>
            </p>
          {/if}

          {#if result.items.length === 0}
            <p class="mt-10 text-sm text-muted-foreground">{t("home.empty")}</p>
          {:else}
            <ul class="mt-5 space-y-3">
              {#each paged.items as item (item.key)}
                <ObjectRow {item} />
              {/each}
            </ul>

            {#if paged.pages > 1}
              <nav
                aria-label={t("home.page")}
                class="mt-8 flex items-center justify-center gap-1 text-sm"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={paged.current === 1}
                  onclick={() =>
                    update((p) => p.set("page", String(paged.current - 1)), {
                      keepPage: true,
                    })}
                >
                  {t("home.previous")}
                </Button>
                {#each Array.from({ length: paged.pages }, (_, i) => i + 1) as n (n)}
                  <button
                    type="button"
                    aria-current={n === paged.current ? "page" : undefined}
                    class={cn(
                      "size-8 rounded-md text-sm tabular-nums",
                      n === paged.current
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                    onclick={() =>
                      update((p) => p.set("page", String(n)), {
                        keepPage: true,
                      })}
                  >
                    {n}
                  </button>
                {/each}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={paged.current === paged.pages}
                  onclick={() =>
                    update((p) => p.set("page", String(paged.current + 1)), {
                      keepPage: true,
                    })}
                >
                  {t("home.next")}
                </Button>
              </nav>
            {/if}
          {/if}
        </div>

        <aside class="lg:sticky lg:top-20 lg:self-start">
          <div class="rounded-xl bg-card px-4 py-2 ring-1 ring-foreground/10">
            <FacetSection
              title={t("facet.type")}
              rows={kindRows(result)}
              selected={kind ? [kind] : []}
              ontoggle={toggleKind}
            />
            {#each facetGroups(result) as section (section.group)}
              <FacetSection
                title={t(`facet.${section.group}` as Key)}
                rows={section.rows}
                selected={tags}
                ontoggle={toggleTag}
                open={section.group === "region" ||
                  section.group === "category"}
              />
            {/each}
          </div>
        </aside>
      </div>
    {/snippet}
  </Async>
</section>
