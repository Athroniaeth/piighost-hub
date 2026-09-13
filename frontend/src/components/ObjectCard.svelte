<script lang="ts">
  import type { SearchHit } from "../generated/api";
  import KindBadge from "./KindBadge.svelte";
  import TagChip from "./TagChip.svelte";
  import { refPath } from "../lib/router.svelte";

  let { item }: { item: SearchHit } = $props();

  const shown = $derived(item.labels.slice(0, 6));
  const rest = $derived(item.labels.length - shown.length);
</script>

<li class="surface rounded-lg p-4">
  <div class="flex flex-wrap items-baseline gap-2">
    <a href={refPath(item.key)} class="font-medium hover:underline"
      >{item.key}</a
    >
    <KindBadge kind={item.kind} />
    <code class="muted font-mono text-xs">:{item.commit}</code>
  </div>
  {#if shown.length > 0}
    <p class="mt-2 font-mono text-xs muted">
      {shown.join(" · ")}{rest > 0 ? ` · +${rest}` : ""}
    </p>
  {/if}
  {#if item.tags.length > 0}
    <ul class="mt-3 flex flex-wrap gap-1.5">
      {#each item.tags as tag (tag)}
        <li><TagChip {tag} href="/browse?tag={encodeURIComponent(tag)}" /></li>
      {/each}
    </ul>
  {/if}
</li>
