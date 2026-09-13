<script lang="ts">
  import type { HitOut } from "../generated/api";
  import { segments } from "../lib/highlight";
  import { labelStyle } from "../lib/labels";

  /** A text with its kept detections tinted in place, the studio's highlight. */
  let {
    text,
    hits,
    colors = undefined,
  }: { text: string; hits: HitOut[]; colors?: Map<string, string> } = $props();

  const parts = $derived(segments(text, hits));
</script>

<p class="whitespace-pre-wrap font-mono text-sm leading-relaxed">
  {#each parts as part, index (index)}{#if part.hit}<span
        class="rounded px-1 {labelStyle(part.hit.label, colors)}"
        title="{part.hit.label} · {part.hit.detector}">{part.text}</span
      >{:else}{part.text}{/if}{/each}
</p>
