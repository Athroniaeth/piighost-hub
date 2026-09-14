<script lang="ts">
  import { PLACEHOLDER, placeholderLabel } from "../lib/placeholders";
  import { labelStyle } from "../lib/labels";

  /**
   * A de-identified text, with each placeholder tinted like the value it stands
   * for. Seeing `<<EMAIL:1>>` in the same colour the address had is what makes
   * the substitution readable: the eye follows one value from the input to what
   * the model receives, and back to the restored reply.
   */
  let {
    text,
    colors = undefined,
  }: { text: string; colors?: Map<string, string> } = $props();

  const parts = $derived.by(() => {
    const out: { text: string; label: string | null }[] = [];
    let cursor = 0;
    for (const match of text.matchAll(PLACEHOLDER)) {
      const start = match.index ?? 0;
      if (start > cursor)
        out.push({ text: text.slice(cursor, start), label: null });
      out.push({ text: match[0], label: placeholderLabel(match[0]) });
      cursor = start + match[0].length;
    }
    if (cursor < text.length)
      out.push({ text: text.slice(cursor), label: null });
    return out;
  });
</script>

<p class="whitespace-pre-wrap font-mono text-sm leading-relaxed">
  {#each parts as part, index (index)}{#if part.label}<span
        class="rounded px-1 {labelStyle(part.label, colors)}">{part.text}</span
      >{:else}{part.text}{/if}{/each}
</p>
