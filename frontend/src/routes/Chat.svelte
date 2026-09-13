<script lang="ts">
  import type { ChatOut } from "../generated/api";
  import RefPicker from "../components/RefPicker.svelte";
  import { ApiError, api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";

  let ref = $state("piighost/fr-default");
  let draft = $state(
    "Bonjour, je suis joignable à patrick@example.com ou au 06 39 98 12 34.",
  );
  let messages = $state<string[]>([]);
  let result = $state<ChatOut | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);
  let reveal = $state(false);

  async function send() {
    if (draft.trim() === "") return;
    const next = [...messages, draft.trim()];
    busy = true;
    error = null;
    try {
      result = await api.chat(ref, next);
      messages = next;
      draft = "";
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
    } finally {
      busy = false;
    }
  }

  function reset() {
    messages = [];
    result = null;
    error = null;
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("chat.title")}</h1>
  <p class="muted mt-2 max-w-2xl text-sm">{t("chat.lede")}</p>

  <div class="mt-5 flex flex-wrap items-end gap-3">
    <div class="min-w-64 flex-1">
      <label class="mb-1.5 block text-sm font-medium" for="chat-ref"
        >{t("play.object")}</label
      >
      <RefPicker id="chat-ref" bind:value={ref} />
    </div>
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={reveal} />
      {t("chat.modelSees")}
    </label>
    {#if messages.length > 0}
      <button
        type="button"
        class="hairline rounded-md border px-3 py-2 text-sm"
        onclick={reset}
      >
        {t("chat.reset")}
      </button>
    {/if}
  </div>

  <ol class="mt-6 space-y-3">
    {#each result?.turns ?? [] as turn, index (index)}
      <li class="space-y-2">
        <p
          class="surface ms-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm"
        >
          {reveal ? turn.user_sent : turn.user_text}
        </p>
        <p
          class="max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--accent-soft)] px-3 py-2 text-sm"
        >
          {reveal ? turn.reply_received : turn.reply_text}
        </p>
      </li>
    {/each}
  </ol>

  {#if error}
    <p class="surface mt-4 rounded-lg p-3 text-sm" role="alert">{error}</p>
  {/if}

  <form
    class="mt-5 flex gap-2"
    onsubmit={(event) => {
      event.preventDefault();
      send();
    }}
  >
    <input
      bind:value={draft}
      placeholder={t("chat.placeholder")}
      aria-label={t("chat.placeholder")}
      class="hairline flex-1 rounded-md border bg-[var(--page)] px-3 py-2 text-sm"
    />
    <button
      type="submit"
      class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      disabled={busy || draft.trim() === ""}
    >
      {t("chat.send")}
    </button>
  </form>

  {#if result && Object.keys(result.mapping).length > 0}
    <section class="mt-6">
      <h2 class="text-sm font-semibold">{t("chat.mapping")}</h2>
      <ul class="mt-2 space-y-1 font-mono text-xs">
        {#each Object.entries(result.mapping) as [token, value] (token)}
          <li class="surface rounded px-2 py-1">{token} → {value}</li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
