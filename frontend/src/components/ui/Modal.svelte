<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import type { Snippet } from "svelte";
  import { cn } from "../../lib/cn";
  import { t } from "../../lib/i18n.svelte";

  /**
   * A dialog, on the native element.
   *
   * `showModal()` puts it in the browser's top layer, which gives the backdrop,
   * the focus trap and Escape without a line of script, and means no ancestor's
   * overflow can clip it. The card that holds the contribution page clips to
   * draw its corners, so anything less would be cut, as this project has
   * learned twice.
   *
   * No display utility on the dialog itself: an author `display` would beat the
   * user-agent rule that hides it when closed. The layout lives on the panel
   * inside.
   */
  let {
    open = $bindable(false),
    title,
    wide = false,
    children,
  }: {
    open?: boolean;
    title: string;
    wide?: boolean;
    children: Snippet;
  } = $props();

  let element = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  });
</script>

<dialog
  bind:this={element}
  aria-label={title}
  class="m-auto max-h-[85dvh] w-[min(92vw,var(--modal-width))] rounded-xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
  class:modal-wide={wide}
  onclose={() => (open = false)}
>
  <div class={cn("flex max-h-[85dvh] flex-col")}>
    <header class="flex shrink-0 items-center gap-2 border-b px-4 py-3">
      <h2 class="text-sm font-medium">{title}</h2>
      <button
        type="button"
        aria-label={t("common.close")}
        class="ms-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        onclick={() => (open = false)}
      >
        <X class="size-4" />
      </button>
    </header>
    <div class="min-h-0 flex-1 overflow-auto p-4">
      {@render children()}
    </div>
  </div>
</dialog>
