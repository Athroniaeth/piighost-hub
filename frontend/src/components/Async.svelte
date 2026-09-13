<script lang="ts" generics="T">
  import { t } from "../lib/i18n.svelte";

  /**
   * Render a promise: a spinner, an error with a retry, or the content.
   *
   * Every page loads from the API, and repeating three states in each one is
   * how one of them ends up forgotten.
   */
  let {
    promise,
    children,
    onretry = null,
  }: {
    promise: Promise<T>;
    children: import("svelte").Snippet<[T]>;
    onretry?: (() => void) | null;
  } = $props();
</script>

{#await promise}
  <p class="muted py-8 text-sm" role="status">{t("common.loading")}…</p>
{:then value}
  {@render children(value)}
{:catch error}
  <div class="surface rounded-lg p-4" role="alert">
    <p class="text-sm">{t("common.error")}: {error.message}</p>
    {#if onretry}
      <button
        type="button"
        class="accent mt-2 text-sm underline"
        onclick={onretry}
      >
        {t("common.retry")}
      </button>
    {/if}
  </div>
{/await}
