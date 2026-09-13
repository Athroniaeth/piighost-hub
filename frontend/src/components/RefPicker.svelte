<script lang="ts">
  import { api } from "../lib/api";
  import { FIELD_MONO } from "../lib/ui";

  /** A select listing every object, used wherever a page needs one reference. */
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

  const options = $derived(api.search(kind ? { kind } : {}));
</script>

{#await options then result}
  <select {id} aria-label={label} bind:value class={FIELD_MONO}>
    {#each result.items as item (item.key)}
      <option value={item.key}>{item.key}</option>
    {/each}
  </select>
{/await}
