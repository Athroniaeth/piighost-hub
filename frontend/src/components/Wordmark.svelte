<script lang="ts">
  import Logo from "./Logo.svelte";
  import { cn } from "../lib/cn";

  /**
   * The name, once, so the nav and the hero cannot drift apart.
   *
   * Not translated and not a dictionary key: a product name is the same in
   * every language, and `hub` carries the accent colour the way it does
   * everywhere else on the site. The mark sizes itself in `em`, so the caller
   * only sets a font size.
   */
  let { class: extra = "" }: { class?: string } = $props();
</script>

<span class={cn("inline-flex items-center gap-[0.4em] font-mono", extra)}>
  <Logo class="size-[1.05em] shrink-0" />
  <span>piighost <span class="text-primary">hub</span></span>
</span>
