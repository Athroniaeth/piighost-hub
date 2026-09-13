<script lang="ts">
  import Loader from "@lucide/svelte/icons/loader-circle";
  import Send from "@lucide/svelte/icons/send";
  import type { ChatOut } from "../generated/api";
  import PlaygroundShell from "../components/PlaygroundShell.svelte";
  import RefPicker from "../components/RefPicker.svelte";
  import Button from "../components/ui/Button.svelte";
  import Region from "../components/ui/Region.svelte";
  import { ApiError, api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";
  import { FIELD } from "../lib/ui";

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

<PlaygroundShell>
  <Region
    step={1}
    done={messages.length > 0}
    title={t("play.configure")}
    bodyClass="gap-4"
  >
    <RefPicker id="chat-ref" bind:value={ref} label={t("play.object")} />
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={reveal} class="accent-primary" />
      {t("chat.reveal")}
    </label>
    <p class="text-xs text-muted-foreground">{t("chat.lede")}</p>
    <div class="mt-auto flex flex-col gap-2 pt-2">
      {#if messages.length > 0}
        <Button variant="outline" size="sm" class="self-start" onclick={reset}
          >{t("chat.reset")}</Button
        >
      {/if}
      {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
    </div>
  </Region>

  <Region step={2} done={messages.length > 0} title={t("play.chat")}>
    <ol class="flex flex-1 flex-col gap-3 overflow-auto">
      {#each result?.turns ?? [] as turn, index (index)}
        <li class="flex flex-col gap-2">
          <p
            class="ms-auto max-w-[85%] rounded-2xl rounded-br-sm bg-muted px-3 py-2 text-sm"
          >
            {reveal ? turn.user_sent : turn.user_text}
          </p>
          <p
            class="max-w-[85%] rounded-2xl rounded-bl-sm bg-primary/10 px-3 py-2 text-sm"
          >
            {reveal ? turn.reply_received : turn.reply_text}
          </p>
        </li>
      {:else}
        <li class="text-sm text-muted-foreground">{t("chat.empty")}</li>
      {/each}
    </ol>
    <form
      class="mt-3 flex shrink-0 gap-2"
      onsubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <input
        bind:value={draft}
        placeholder={t("chat.placeholder")}
        aria-label={t("chat.placeholder")}
        class="{FIELD} h-8 text-sm"
      />
      <Button
        type="submit"
        disabled={busy || draft.trim() === ""}
        aria-label={t("chat.send")}
      >
        {#if busy}<Loader class="animate-spin" />{:else}<Send />{/if}
      </Button>
    </form>
  </Region>

  <Region
    step={3}
    done={Boolean(result && Object.keys(result.mapping).length)}
    title={t("chat.mapping")}
  >
    {#if result && Object.keys(result.mapping).length > 0}
      <ul class="space-y-1.5">
        {#each Object.entries(result.mapping) as [token, value] (token)}
          <li
            class="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 font-mono text-xs"
          >
            <span class="text-primary">{token}</span>
            <span class="truncate text-muted-foreground">{value}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-sm text-muted-foreground">{t("play.empty")}</p>
    {/if}
  </Region>
</PlaygroundShell>
