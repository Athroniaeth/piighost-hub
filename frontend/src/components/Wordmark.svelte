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
  <!-- A hair lower than the box centre: the mono face has no ascender on most
       of `piighost`, so a mathematically centred square reads as floating. -->
  <Logo class="size-[1.05em] shrink-0 translate-y-[0.06em]" />
  <!-- 0.35em: a mono space is 0.6 and reads as two names, 0.2 reads as one
       word. This is a word break that still holds the pair together. -->
  <span class="inline-flex items-center gap-[0.35em]">
    <span>piighost</span>
    <span class="text-primary">hub</span>
  </span>
</span>
