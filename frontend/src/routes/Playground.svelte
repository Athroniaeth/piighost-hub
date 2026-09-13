<script lang="ts">
  import type { RunOut, SampleOut } from "../generated/api";
  import Code from "../components/Code.svelte";
  import Highlighted from "../components/Highlighted.svelte";
  import RefPicker from "../components/RefPicker.svelte";
  import { ApiError, api } from "../lib/api";
  import { labelClass } from "../lib/highlight";
  import { i18n, t } from "../lib/i18n.svelte";
  import { refPath, router } from "../lib/router.svelte";

  // Written as a constant: inside an attribute, Svelte would read the `{6}` of a
  // regex quantifier as an expression and render a bare 6.
  const CANDIDATE_PLACEHOLDER = String.raw`\bORD-[0-9]{6}\b`;

  const DEFAULT_TEXT =
    "Write to john.doe@example.com or call +1 415-555-0123. Card 4111 1111 1111 1111.";

  let ref = $state(router.query.get("ref") ?? "piighost/regex-default");
  let text = $state(DEFAULT_TEXT);
  let run = $state<RunOut | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  let candidateRegex = $state("");
  let candidateRun = $state<RunOut | null>(null);
  let candidateError = $state<string | null>(null);
  let candidateBusy = $state(false);

  const samples = $derived(api.samples());

  const dropped = $derived(run?.hits.filter((hit) => !hit.kept) ?? []);
  const kept = $derived(run?.hits.filter((hit) => hit.kept) ?? []);

  async function go() {
    busy = true;
    error = null;
    try {
      run = await api.run(ref, text);
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
      run = null;
    } finally {
      busy = false;
    }
  }

  async function goCandidate() {
    candidateBusy = true;
    candidateError = null;
    try {
      candidateRun = await api.candidate(candidateRegex, text, "CANDIDATE");
    } catch (caught) {
      candidateError =
        caught instanceof ApiError ? caught.message : String(caught);
      candidateRun = null;
    } finally {
      candidateBusy = false;
    }
  }

  function useSample(sample: SampleOut) {
    text = sample.text.trim();
    run = null;
  }
</script>

<div class="mx-auto max-w-6xl px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("play.title")}</h1>
  <p class="muted mt-2 max-w-2xl text-sm">{t("play.lede")}</p>

  <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div>
      <label class="mb-1.5 block text-sm font-medium" for="play-ref"
        >{t("play.object")}</label
      >
      <RefPicker id="play-ref" bind:value={ref} />

      <p class="mt-4 mb-1.5 text-sm font-medium">{t("play.sample")}</p>
      {#await samples then result}
        <ul class="flex flex-wrap gap-1.5">
          {#each result.items as sample (sample.name)}
            <li>
              <button
                type="button"
                class="hairline rounded-full border px-2.5 py-0.5 text-xs"
                onclick={() => useSample(sample)}
              >
                {i18n.pick(sample.title)}
              </button>
            </li>
          {/each}
        </ul>
      {/await}

      <label class="mt-4 mb-1.5 block text-sm font-medium" for="play-text">
        {t("play.custom")}
      </label>
      <textarea
        id="play-text"
        bind:value={text}
        rows="12"
        class="hairline w-full rounded-md border bg-[var(--page)] p-3 font-mono text-[0.8rem]"
      ></textarea>

      <button
        type="button"
        class="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        onclick={go}
        disabled={busy || text.trim() === ""}
      >
        {busy ? `${t("play.running")}…` : t("play.run")}
      </button>
    </div>

    <div>
      {#if error}
        <p class="surface rounded-lg p-3 text-sm" role="alert">{error}</p>
      {/if}

      {#if run}
        <h2 class="mb-1.5 text-sm font-medium">{t("play.detected")}</h2>
        <Highlighted {text} hits={run.hits} />

        <p class="muted mt-2 text-xs">
          {t("play.elapsed")}
          {run.elapsed_ms.toFixed(1)} ms · {kept.length}
          {t("play.kept")}
        </p>
        {#if run.truncated}
          <p class="muted mt-1 text-xs">{t("play.truncated")}</p>
        {/if}
        {#if run.unsupported.length > 0}
          <p class="muted mt-1 text-xs">
            {t("play.unsupported")} ({run.unsupported.join(", ")})
          </p>
        {/if}

        <h2 class="mt-4 mb-1.5 text-sm font-medium">{t("play.result")}</h2>
        <Code code={run.anonymized_text} wrap />

        {#if run.hits.length > 0}
          <h2 class="mt-4 mb-1.5 text-sm font-medium">
            {t("play.detections")}
          </h2>
          <ul class="space-y-1 text-xs">
            {#each run.hits as hit, index (index)}
              <li
                class="surface flex flex-wrap items-baseline gap-2 rounded px-2 py-1"
              >
                <span class="hl {labelClass(hit.label)} font-mono"
                  >{hit.label}</span
                >
                <code class="font-mono">{hit.text}</code>
                <span class="muted">{hit.detector}</span>
                {#if hit.pattern}
                  <a href={refPath(hit.pattern)} class="muted underline"
                    >{hit.pattern}</a
                  >
                {/if}
                {#if !hit.kept}
                  <span class="muted italic">{t("play.dropped")}</span>
                {/if}
              </li>
            {/each}
          </ul>
          {#if dropped.length > 0}
            <p class="muted mt-2 text-xs">
              {dropped.length}
              {t("play.dropped")}
            </p>
          {/if}
        {/if}
      {/if}
    </div>
  </div>

  <section class="hairline mt-10 border-t pt-6">
    <h2 class="text-sm font-semibold">{t("play.candidate")}</h2>
    <p class="muted mt-1 max-w-2xl text-sm">{t("play.candidateLede")}</p>
    <div class="mt-3 flex flex-wrap gap-2">
      <input
        bind:value={candidateRegex}
        placeholder={CANDIDATE_PLACEHOLDER}
        aria-label={t("play.candidate")}
        class="hairline min-w-64 flex-1 rounded-md border bg-[var(--page)] px-3 py-2 font-mono text-sm"
      />
      <button
        type="button"
        class="hairline rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        onclick={goCandidate}
        disabled={candidateBusy || candidateRegex.trim() === ""}
      >
        {candidateBusy ? `${t("play.running")}…` : t("play.candidateRun")}
      </button>
    </div>
    {#if candidateError}
      <p class="surface mt-3 rounded-lg p-3 text-sm" role="alert">
        {candidateError}
      </p>
    {/if}
    {#if candidateRun}
      <div class="mt-3">
        <Highlighted {text} hits={candidateRun.hits} />
      </div>
    {/if}
  </section>
</div>
