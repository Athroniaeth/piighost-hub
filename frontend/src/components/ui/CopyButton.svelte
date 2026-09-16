<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Copy from "@lucide/svelte/icons/copy";
  import X from "@lucide/svelte/icons/x";
  import Button from "./Button.svelte";
  import { t } from "../../lib/i18n.svelte";

  /**
   * Copy to the clipboard, wherever the page happens to be served from.
   *
   * `navigator.clipboard` exists only in a secure context, which plain HTTP
   * over a hostname is not, so the modern call was simply `undefined` on the
   * preview and the button did nothing at all — not even fail visibly, since
   * the rejection had nowhere to go. execCommand is deprecated and is the
   * only thing that works there, so it is the fallback rather than the choice.
   */
  let { value, class: extra = "" }: { value: string; class?: string } =
    $props();

  let state_ = $state<"idle" | "copied" | "failed">("idle");
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function write(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Permission refused or the document is not focused; try the old way.
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    // Off-screen rather than hidden: the selection an unrendered element
    // carries is not a selection the copy command can read.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.append(area);
    area.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }

  async function copy() {
    state_ = (await write(value)) ? "copied" : "failed";
    clearTimeout(timer);
    timer = setTimeout(() => (state_ = "idle"), 1500);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<Button
  variant="ghost"
  size="icon-sm"
  aria-label={state_ === "copied"
    ? t("common.copied")
    : state_ === "failed"
      ? t("common.copyFailed")
      : t("common.copy")}
  class={extra}
  onclick={copy}
>
  {#if state_ === "copied"}
    <Check class="size-4" />
  {:else if state_ === "failed"}
    <X class="size-4 text-destructive" />
  {:else}
    <Copy class="size-4" />
  {/if}
</Button>
