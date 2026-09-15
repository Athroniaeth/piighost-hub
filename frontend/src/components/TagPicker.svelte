<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import type { VocabularyOut } from "../generated/api";
  import { api } from "../lib/api";
  import { i18n, t, type Key } from "../lib/i18n.svelte";

  /**
   * The closed tag vocabulary, as a filterable list.
   *
   * The vocabulary is closed on purpose, so free text would only produce
   * manifests the registry rejects. Showing all fifty tags at once in a narrow
   * column is unreadable, so the picked ones sit on top as chips and the rest
   * are one filter away, grouped by what they are.
   */
  let { value = $bindable() }: { value: string[] } = $props();

  const vocabulary = $derived(api.vocabulary());

  let filter = $state("");

  const needle = $derived(filter.trim().toLowerCase());

  type Section = { kind: string; rows: { tag: string; label: string }[] };

  function grouped(result: VocabularyOut): Section[] {
    const sections: Section[] = [];
    for (const entry of result.items) {
      const label = i18n.pick(entry.label);
      if (
        needle !== "" &&
        !entry.tag.includes(needle) &&
        !label.toLowerCase().includes(needle)
      )
        continue;
      const section = sections.find((one) => one.kind === entry.kind);
      if (section) section.rows.push({ tag: entry.tag, label });
      else
        sections.push({ kind: entry.kind, rows: [{ tag: entry.tag, label }] });
    }
    return sections;
  }

  function toggle(tag: string) {
    value = value.includes(tag)
      ? value.filter((entry) => entry !== tag)
      : [...value, tag];
  }
</script>

<div class="space-y-2">
  {#if value.length > 0}
    <ul class="flex flex-wrap gap-1">
      {#each value as tag (tag)}
        <li>
          <button
            type="button"
            class="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 ps-2 pe-1 text-xs text-primary"
            onclick={() => toggle(tag)}
          >
            {tag}
            <X class="size-3" aria-hidden="true" />
            <span class="sr-only">{t("draft.tagRemove")}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <input
    bind:value={filter}
    spellcheck="false"
    placeholder={t("draft.tagFilter")}
    aria-label={t("draft.tagFilter")}
    class="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
  />

  {#await vocabulary then result}
    <div class="max-h-44 overflow-y-auto rounded-md border p-1">
      {#each grouped(result) as section (section.kind)}
        <p
          class="px-1 pt-1.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
        >
          {t(`facet.${section.kind}` as Key)}
        </p>
        {#each section.rows as row (row.tag)}
          <label
            class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted/60"
          >
            <input
              type="checkbox"
              class="size-3.5 shrink-0 accent-primary"
              checked={value.includes(row.tag)}
              onchange={() => toggle(row.tag)}
            />
            <span class="truncate font-mono text-xs">{row.tag}</span>
            <span class="truncate text-xs text-muted-foreground">
              {row.label}
            </span>
          </label>
        {/each}
      {:else}
        <p class="px-1 py-2 text-sm text-muted-foreground">{t("pick.none")}</p>
      {/each}
    </div>
  {/await}
</div>
