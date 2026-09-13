<script lang="ts">
  import { regexTokens, tomlTokens } from "../lib/highlight";
  import { t } from "../lib/i18n.svelte";

  /**
   * A code block, highlighted by class rather than inline style so the
   * production Content-Security-Policy accepts it.
   */
  let {
    code,
    language = "plain",
    copyable = true,
    wrap = false,
  }: {
    code: string;
    language?: "toml" | "regex" | "plain";
    copyable?: boolean;
    wrap?: boolean;
  } = $props();

  const tokens = $derived(
    language === "toml"
      ? tomlTokens(code)
      : language === "regex"
        ? regexTokens(code)
        : null,
  );

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    await navigator.clipboard.writeText(code);
    copied = true;
    clearTimeout(timer);
    timer = setTimeout(() => (copied = false), 1500);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<div class="relative">
  {#if copyable}
    <button
      type="button"
      class="hairline no-print absolute end-2 top-2 rounded border bg-[var(--page)] px-2 py-0.5 text-xs"
      onclick={copy}
    >
      {copied ? t("detail.copied") : t("detail.copy")}
    </button>
  {/if}
  <pre
    class="surface overflow-x-auto rounded-lg p-3 font-mono text-[0.8rem] leading-relaxed"
    class:whitespace-pre-wrap={wrap}
    class:break-all={wrap}><code
      >{#if tokens}{#each tokens as token, index (index)}<span
            class="tok-{token.kind}">{token.text}</span
          >{/each}{:else}{code}{/if}</code
    ></pre>
</div>
