<script lang="ts">
  import { api } from "../lib/api";

  /** A select listing every object, used wherever a page needs one reference. */
  let {
    value = $bindable(),
    kind = null,
    id,
  }: {
    value: string;
    kind?: "pattern" | "group" | "config" | null;
    id: string;
  } = $props();

  const options = $derived(api.search(kind ? { kind } : {}));
</script>

{#await options then result}
  <select
    {id}
    bind:value
    class="hairline w-full rounded-md border bg-[var(--page)] px-3 py-2 text-sm"
  >
    {#each result.items as item (item.key)}
      <option value={item.key}>{item.key} ({item.kind})</option>
    {/each}
  </select>
{/await}
