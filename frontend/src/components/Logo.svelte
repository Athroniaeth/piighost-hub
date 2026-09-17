<script lang="ts">
  /**
   * The mark: piighost's ghost, on the hub's badge.
   *
   * The same icon the library's documentation uses for its logo, which is
   * lucide/ghost — so the two sites are recognisably one project rather than
   * two that happen to share a name. The paths are copied from
   * @lucide/svelte 1.45.0 (ISC) rather than rendered from the component,
   * because the favicon is a static file that cannot import anything and the
   * two must not drift.
   *
   * The badge stays: a thin outline alone disappears at sixteen pixels, and
   * the mark has to survive a browser tab.
   *
   * Colour comes from Tailwind classes rather than a `style` attribute: the
   * production CSP allows `style-src 'self'` with no `unsafe-inline`.
   */
  let { class: extra = "" }: { class?: string } = $props();
</script>

<svg
  viewBox="0 0 32 32"
  class={extra}
  role="img"
  aria-hidden="true"
  focusable="false"
>
  <rect width="32" height="32" rx="8" class="fill-primary" />
  <g
    transform="translate(4 4)"
    class="stroke-primary-foreground"
    fill="none"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M15 10v1" />
    <path
      d="M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z"
    />
    <path d="M9 10v1" />
  </g>
</svg>
