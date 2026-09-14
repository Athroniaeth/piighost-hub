<script lang="ts">
  import { placeholderLabel } from "../lib/placeholders";
  import { labelStyle } from "../lib/labels";

  /**
   * A restored text, with each value that was de-identified tinted like the
   * token that stood in for it. The restored side carries no offsets, only the
   * token-to-value map, so the values are located here; longest first, so a
   * value contained in another does not cut it in two.
   */
  let {
    text,
    mapping,
    colors = undefined,
  }: {
    text: string;
    mapping: Record<string, string>;
    colors?: Map<string, string>;
  } = $props();

  const parts = $derived.by(() => {
    const values = Object.entries(mapping)
      .map(([token, value]) => ({ value, label: placeholderLabel(token) }))
      .filter((entry) => entry.value !== "" && entry.label !== null)
      .sort((a, b) => b.value.length - a.value.length);

    let out: { text: string; label: string | null }[] = [{ text, label: null }];
    for (const entry of values) {
      const next: typeof out = [];
      for (const part of out) {
        if (part.label !== null) {
          next.push(part);
          continue;
        }
        let rest = part.text;
        let at = rest.indexOf(entry.value);
        while (at !== -1) {
          if (at > 0) next.push({ text: rest.slice(0, at), label: null });
          next.push({ text: entry.value, label: entry.label });
          rest = rest.slice(at + entry.value.length);
          at = rest.indexOf(entry.value);
        }
        if (rest) next.push({ text: rest, label: null });
      }
      out = next;
    }
    return out;
  });
</script>

<span
  >{#each parts as part, index (index)}{#if part.label}<span
        class="rounded px-1 {labelStyle(part.label, colors)}">{part.text}</span
      >{:else}{part.text}{/if}{/each}</span
>
