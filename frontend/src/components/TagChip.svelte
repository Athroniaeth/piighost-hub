<script lang="ts">
  /** A tag, optionally a link that filters the browse page by it. */
  let {
    tag,
    kind = "",
    count = null,
    href = null,
    pressed = false,
    onclick = null,
  }: {
    tag: string;
    kind?: string;
    count?: number | null;
    href?: string | null;
    pressed?: boolean;
    onclick?: (() => void) | null;
  } = $props();

  const base =
    "hairline inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs";
</script>

{#if onclick}
  <button
    type="button"
    class={base}
    class:bg-[var(--accent-soft)]={pressed}
    class:accent={pressed}
    aria-pressed={pressed}
    {onclick}
  >
    <span>{tag}</span>
    {#if count !== null}<span class="muted tabular-nums">{count}</span>{/if}
  </button>
{:else if href}
  <a class={base} {href}>
    <span>{tag}</span>
    {#if count !== null}<span class="muted tabular-nums">{count}</span>{/if}
  </a>
{:else}
  <span class={base} title={kind}>
    <span>{tag}</span>
    {#if count !== null}<span class="muted tabular-nums">{count}</span>{/if}
  </span>
{/if}
