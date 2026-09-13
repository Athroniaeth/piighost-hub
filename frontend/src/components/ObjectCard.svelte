<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import type { SearchHit } from "../generated/api";
  import Badge from "./ui/Badge.svelte";
  import EntityLabel from "./EntityLabel.svelte";
  import { i18n, t } from "../lib/i18n.svelte";
  import { refPath } from "../lib/router.svelte";

  /** The studio's project card, for one registry object. */
  let { item }: { item: SearchHit } = $props();

  const shown = $derived(item.labels.slice(0, 5));
  const rest = $derived(item.labels.length - shown.length);
  const kind = $derived(
    item.kind === "pattern"
      ? t("kind.pattern")
      : item.kind === "group"
        ? t("kind.group")
        : t("kind.config"),
  );
</script>

<a href={refPath(item.key)} class="group flex">
  <article
    class="flex h-full w-full flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 transition-colors group-hover:ring-primary"
  >
    <header class="flex items-start justify-between gap-2">
      <h3 class="font-mono text-base font-medium leading-snug">{item.name}</h3>
      <Badge variant="outline" class="shrink-0">{kind}</Badge>
    </header>
    <p class="line-clamp-2 text-sm text-muted-foreground">
      {i18n.pick(item.description)}
    </p>
    {#if shown.length > 0}
      <p class="flex flex-wrap gap-1">
        {#each shown as label (label)}<EntityLabel {label} />{/each}
        {#if rest > 0}<span class="self-center text-xs text-muted-foreground"
            >+{rest}</span
          >{/if}
      </p>
    {/if}
    <footer class="mt-auto flex items-center justify-between gap-2 pt-1">
      <p class="truncate text-xs text-muted-foreground">
        {item.namespace} · <span class="font-mono">{item.commit}</span>
      </p>
      <ArrowRight
        class="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1"
      />
    </footer>
  </article>
</a>
