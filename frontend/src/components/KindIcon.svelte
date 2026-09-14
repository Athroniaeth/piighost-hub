<script lang="ts">
  import Layers from "@lucide/svelte/icons/layers";
  import Regex from "@lucide/svelte/icons/regex";
  import Workflow from "@lucide/svelte/icons/workflow";

  /** One glyph per object kind, so a list scans by shape before by word. */
  let { kind, class: extra = "" }: { kind: string; class?: string } = $props();
</script>

{#if kind === "pattern"}
  <Regex class={extra} aria-hidden="true" />
{:else if kind === "group"}
  <Layers class={extra} aria-hidden="true" />
{:else}
  <Workflow class={extra} aria-hidden="true" />
{/if}
