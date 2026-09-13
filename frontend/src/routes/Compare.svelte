<script lang="ts">
  import type { CompareOut } from "../generated/api";
  import Highlighted from "../components/Highlighted.svelte";
  import RefPicker from "../components/RefPicker.svelte";
  import { ApiError, api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";

  let refs = $state<string[]>([
    "piighost/regex-default",
    "piighost/fr-default",
  ]);
  let text = $state(
    "Patrick Dupont, 06 39 98 12 34, patrick@example.com, SIRET 732 829 320 00074, 75008 Paris.",
  );
  const slots = $derived(refs.map((_, index) => index));
  let result = $state<CompareOut | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  async function go() {
    busy = true;
    error = null;
    try {
      result = await api.compare(refs, text);
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
      result = null;
    } finally {
      busy = false;
    }
  }
</script>

<div class="mx-auto max-w-6xl px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("compare.title")}</h1>
  <p class="muted mt-2 max-w-2xl text-sm">{t("compare.lede")}</p>

  <div class="mt-6 grid gap-3 sm:grid-cols-2">
    {#each slots as index (index)}
      <div>
        <label class="mb-1.5 block text-sm font-medium" for="cmp-{index}">
          {index + 1}
        </label>
        <RefPicker id="cmp-{index}" bind:value={refs[index]} />
      </div>
    {/each}
  </div>

  {#if refs.length < 4}
    <button
      type="button"
      class="hairline mt-3 rounded-md border px-3 py-1.5 text-sm"
      onclick={() => (refs = [...refs, "piighost/generic"])}
    >
      {t("compare.add")}
    </button>
  {/if}

  <label class="mt-5 mb-1.5 block text-sm font-medium" for="cmp-text"
    >{t("play.custom")}</label
  >
  <textarea
    id="cmp-text"
    bind:value={text}
    rows="5"
    class="hairline w-full rounded-md border bg-[var(--page)] p-3 font-mono text-[0.8rem]"
  ></textarea>

  <button
    type="button"
    class="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    onclick={go}
    disabled={busy}
  >
    {busy ? `${t("play.running")}…` : t("compare.run")}
  </button>

  {#if error}
    <p class="surface mt-4 rounded-lg p-3 text-sm" role="alert">{error}</p>
  {/if}

  {#if result}
    <dl class="mt-6 grid gap-3 sm:grid-cols-2">
      <div class="surface rounded-lg p-3">
        <dt class="text-sm font-medium">{t("compare.agreed")}</dt>
        <dd class="mt-1 font-mono text-xs">
          {result.agreed.length > 0 ? result.agreed.join(" · ") : "—"}
        </dd>
      </div>
      <div class="surface rounded-lg p-3">
        <dt class="text-sm font-medium">{t("compare.disputed")}</dt>
        <dd class="mt-1 font-mono text-xs">
          {result.disputed.length > 0 ? result.disputed.join(" · ") : "—"}
        </dd>
      </div>
    </dl>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      {#each result.runs as item (item.ref)}
        <section>
          <h2 class="mb-1.5 font-mono text-sm">{item.ref}</h2>
          <Highlighted {text} hits={item.hits} />
          <p class="muted mt-1 text-xs">
            {item.hits.filter((hit) => hit.kept).length}
            {t("play.kept")} · {item.elapsed_ms.toFixed(1)} ms
          </p>
        </section>
      {/each}
    </div>
  {/if}
</div>
