<script lang="ts">
  /**
   * The mark: piighost's own placeholder, reduced to a glyph.
   *
   * What the library actually does is replace a value with `<<EMAIL:1>>`, so
   * the mark is that token abstracted: two chevrons and, between them, the bar
   * standing where the value used to be. It says the thing the product does
   * rather than decorating around it, and it survives being drawn at 16px.
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
    class="stroke-primary-foreground"
    fill="none"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M11.6 9.8 6.6 16l5 6.2" />
    <path d="M20.4 9.8 25.4 16l-5 6.2" />
    <path d="M16 11.4v9.2" />
  </g>
</svg>
