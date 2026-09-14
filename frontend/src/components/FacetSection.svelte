<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";

  /**
   * One collapsible group of the facet sidebar, the LangSmith Hub pattern: a
   * heading, then checkbox rows with a count pill. Native details/summary keeps
   * it accessible without a line of script.
   */
  let {
    title,
    rows,
    selected,
    ontoggle,
    open = true,
  }: {
    title: string;
    rows: { value: string; label?: string; count: number }[];
    selected: string[];
    ontoggle: (value: string) => void;
    open?: boolean;
  } = $props();
</script>

<details {open} class="group border-b pb-3 last:border-b-0">
  <summary
    class="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-medium select-none"
  >
    {title}
    <ChevronDown
      class="size-4 text-muted-foreground transition-transform group-open:rotate-180"
      aria-hidden="true"
    />
  </summary>
  <ul class="space-y-0.5">
    {#each rows as row (row.value)}
      <li>
        <label
          class="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/60"
        >
          <input
            type="checkbox"
            class="size-3.5 shrink-0 accent-primary"
            checked={selected.includes(row.value)}
            onchange={() => ontoggle(row.value)}
          />
          <span class="min-w-0 flex-1 truncate">{row.label ?? row.value}</span>
          <span
            class="shrink-0 rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums"
            >{row.count}</span
          >
        </label>
      </li>
    {/each}
  </ul>
</details>
