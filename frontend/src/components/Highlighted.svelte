<script lang="ts">
  import type { HitOut } from "../generated/api";
  import { labelClass, segments } from "../lib/highlight";

  /** A text with its kept detections marked in place. */
  let { text, hits }: { text: string; hits: HitOut[] } = $props();

  const parts = $derived(segments(text, hits));
</script>

<p
  class="surface overflow-x-auto whitespace-pre-wrap rounded-lg p-3 font-mono text-[0.8rem] leading-relaxed"
>
  {#each parts as part, index (index)}{#if part.hit}<mark
        class="hl {labelClass(part.hit.label)}"
        title="{part.hit.label} · {part.hit.detector}">{part.text}</mark
      >{:else}{part.text}{/if}{/each}
</p>
