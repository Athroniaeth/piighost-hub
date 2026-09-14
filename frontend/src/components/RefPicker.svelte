<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Search from "@lucide/svelte/icons/search";
  import type { SearchHit, SearchOut } from "../generated/api";
  import { api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { t, type Key } from "../lib/i18n.svelte";
  import KindIcon from "./KindIcon.svelte";

  /**
   * The object picker for the playground and the chat.
   *
   * A native select gave 157 lines of identical grey text, which told a visitor
   * neither what an entry was nor how much it covered. This one leads with the
   * configurations, since that is what someone came to run, and carries the
   * kind as a glyph and the coverage as a number.
   */
  let {
    value = $bindable(),
    kind = null,
    id,
    label,
  }: {
    value: string;
    kind?: "pattern" | "group" | "config" | null;
    id: string;
    label: string;
  } = $props();

  // Configurations first: a configuration is a pipeline you can run, a group is
  // a building block, a pattern is a single shape. Within a kind, the widest
  // coverage leads, matching the catalogue's own default order.
  const RANK: Record<string, number> = { config: 0, group: 1, pattern: 2 };

  let open = $state(false);
  let filter = $state("");
  let box = $state<HTMLDivElement | null>(null);

  const options = $derived(api.search(kind ? { kind } : {}));
  const needle = $derived(filter.trim().toLowerCase());

  function ordered(result: SearchOut): SearchHit[] {
    return [...result.items].sort(
      (a, b) =>
        RANK[a.kind] - RANK[b.kind] ||
        b.labels.length - a.labels.length ||
        a.key.localeCompare(b.key),
    );
  }

  function matching(items: SearchHit[]): SearchHit[] {
    if (needle === "") return items;
    return items.filter(
      (item) =>
        item.key.toLowerCase().includes(needle) ||
        item.tags.some((tag) => tag.includes(needle)) ||
        item.labels.some((entry) => entry.toLowerCase().includes(needle)),
    );
  }

  function choose(key: string) {
    value = key;
    open = false;
    filter = "";
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      open = false;
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      open = true;
      box?.querySelector<HTMLButtonElement>('[role="option"]')?.focus();
    }
  }
</script>

{#await options then result}
  {@const items = ordered(result)}
  {@const current = items.find((item) => item.key === value)}
  <div
    class="relative"
    bind:this={box}
    onfocusout={(event) => {
      if (!box?.contains(event.relatedTarget as Node)) open = false;
    }}
  >
    <button
      {id}
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="listbox"
      class="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      onclick={() => (open = !open)}
      {onkeydown}
    >
      <KindIcon
        kind={current?.kind ?? "config"}
        class="size-4 shrink-0 text-muted-foreground"
      />
      <span class="truncate font-mono">{value}</span>
      {#if current}
        <span
          class="ms-auto shrink-0 tabular-nums text-muted-foreground"
          title="{t(`kind.${current.kind}` as Key)} \u00b7 {current.labels
            .length} {t('pick.coverage')}"
        >
          {current.labels.length}
        </span>
      {/if}
      <ChevronDown class="size-4 shrink-0 text-muted-foreground" />
    </button>

    {#if open}
      <div
        class="absolute start-0 z-20 mt-1 w-[22rem] max-w-[85vw] min-w-full rounded-lg border bg-card shadow-lg"
      >
        <label class="relative block border-b">
          <Search
            class="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            bind:value={filter}
            spellcheck="false"
            placeholder={t("pick.filter")}
            aria-label={t("pick.filter")}
            class="h-9 w-full bg-transparent ps-8 pe-2 text-sm outline-none"
            {onkeydown}
          />
        </label>
        <div
          role="listbox"
          aria-label={label}
          class="max-h-72 overflow-auto p-1"
        >
          {#each matching(items) as item (item.key)}
            <button
              type="button"
              role="option"
              aria-selected={item.key === value}
              class={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none",
                item.key === value
                  ? "bg-muted font-medium"
                  : "hover:bg-muted focus-visible:bg-muted",
              )}
              onclick={() => choose(item.key)}
              {onkeydown}
            >
              <KindIcon
                kind={item.kind}
                class="size-4 shrink-0 text-muted-foreground"
              />
              <span class="truncate font-mono">{item.key}</span>
              <span class="ms-auto shrink-0 text-xs text-muted-foreground">
                {t(`kind.${item.kind}` as Key)}
              </span>
              <span
                class="w-7 shrink-0 text-end text-xs tabular-nums text-muted-foreground"
                title={t("pick.coverage")}
              >
                {item.labels.length}
              </span>
            </button>
          {:else}
            <p class="px-2 py-3 text-sm text-muted-foreground">
              {t("pick.none")}
            </p>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/await}
