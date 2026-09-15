<script lang="ts">
  import type { CountOut } from "../generated/api";

  /**
   * A bar per day, drawn as an SVG with no dependency.
   *
   * A chart library would be the third largest thing in the bundle for one
   * picture. Heights are set through the `y` and `height` attributes rather
   * than a `style`, which is also what the production CSP allows.
   */
  let { rows, label }: { rows: CountOut[]; label: string } = $props();

  const HEIGHT = 64;
  const GAP = 1;

  const peak = $derived(Math.max(1, ...rows.map((row) => row.count)));
  const width = $derived(rows.length * 4);
</script>

<svg
  viewBox="0 0 {width} {HEIGHT}"
  preserveAspectRatio="none"
  class="h-16 w-full"
  role="img"
  aria-label={label}
>
  {#each rows as row, index (row.key)}
    {@const height = Math.max(
      row.count > 0 ? 1.5 : 0,
      (row.count / peak) * HEIGHT,
    )}
    <rect
      x={index * 4}
      y={HEIGHT - height}
      width={4 - GAP}
      {height}
      rx="0.75"
      class={row.count > 0 ? "fill-primary" : "fill-muted-foreground/20"}
    >
      <title>{row.key}: {row.count}</title>
    </rect>
  {/each}
</svg>
