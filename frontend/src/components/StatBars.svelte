<script lang="ts">
  import type { CountOut } from "../generated/api";

  /** A ranked list where the bar is the row's own background, not a second column. */
  let {
    rows,
    href = null,
  }: { rows: CountOut[]; href?: ((key: string) => string) | null } = $props();

  /**
   * Twenty widths, spelled out so Tailwind keeps them in the bundle.
   *
   * A `style:width` would be an inline style, and the production policy is
   * `style-src 'self'` with no `unsafe-inline`. Five percent of resolution is
   * more than a bar of this size can show anyway.
   */
  const WIDTHS = [
    "w-[5%]",
    "w-[10%]",
    "w-[15%]",
    "w-[20%]",
    "w-[25%]",
    "w-[30%]",
    "w-[35%]",
    "w-[40%]",
    "w-[45%]",
    "w-[50%]",
    "w-[55%]",
    "w-[60%]",
    "w-[65%]",
    "w-[70%]",
    "w-[75%]",
    "w-[80%]",
    "w-[85%]",
    "w-[90%]",
    "w-[95%]",
    "w-full",
  ];

  const peak = $derived(Math.max(1, ...rows.map((row) => row.count)));

  function bar(count: number): string {
    const index = Math.round((count / peak) * WIDTHS.length) - 1;
    return WIDTHS[Math.min(WIDTHS.length - 1, Math.max(0, index))];
  }
</script>

<ul class="space-y-1">
  {#each rows as row (row.key)}
    <li class="relative overflow-hidden rounded-md">
      <div
        class="absolute inset-y-0 start-0 bg-primary/10 {bar(row.count)}"
      ></div>
      <div class="relative flex items-center justify-between gap-2 px-2 py-1">
        {#if href}
          <a
            href={href(row.key)}
            class="truncate font-mono text-sm hover:underline">{row.key}</a
          >
        {:else}
          <span class="truncate font-mono text-sm">{row.key}</span>
        {/if}
        <span class="shrink-0 text-sm tabular-nums text-muted-foreground"
          >{row.count}</span
        >
      </div>
    </li>
  {:else}
    <li class="px-2 py-1 text-sm text-muted-foreground">&mdash;</li>
  {/each}
</ul>
