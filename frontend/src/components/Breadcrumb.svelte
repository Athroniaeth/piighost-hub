<script lang="ts">
  import Wordmark from "./Wordmark.svelte";
  import { cn } from "../lib/cn";

  /**
   * The LangSmith-style trail: wordmark, then each segment separated by a thin
   * slash. The last segment is the current page and is not a link.
   */
  let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-2 text-sm">
  <a href="/" class="shrink-0 text-base font-bold tracking-tight">
    <Wordmark />
  </a>
  {#each items as item, index (index)}
    <span class="text-muted-foreground/60" aria-hidden="true">/</span>
    {#if item.href && index < items.length - 1}
      <a
        href={item.href}
        class="truncate text-muted-foreground hover:text-foreground"
        >{item.label}</a
      >
    {:else}
      <span
        class={cn(
          "truncate",
          index === items.length - 1 ? "font-medium" : "text-muted-foreground",
        )}
        aria-current={index === items.length - 1 ? "page" : undefined}
        >{item.label}</span
      >
    {/if}
  {/each}
</nav>
