<script lang="ts">
  import type { SubmissionResult } from "../generated/api";
  import Code from "../components/Code.svelte";
  import { ApiError, api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";

  const EXAMPLE = `schema_version = 1

[pattern]
name = "order-id"
label = "ORDER_ID"
tags = ["international", "business"]
regex = '\\bORD-[0-9]{6}\\b'

[pattern.description]
en = "Internal order identifier, six digits after an ORD- prefix."
fr = "Identifiant de commande interne, six chiffres après un préfixe ORD-."

[[examples.match]]
text = "Order ORD-123456 shipped yesterday."
value = "ORD-123456"

[[examples.no_match]]
text = "ORD-12"
`;

  let kind = $state<"pattern" | "group" | "config">("pattern");
  let namespace = $state("");
  let name = $state("");
  let manifest = $state("");
  let result = $state<SubmissionResult | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  async function check() {
    busy = true;
    error = null;
    try {
      result = await api.submit({ kind, namespace, name, manifest });
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
      result = null;
    } finally {
      busy = false;
    }
  }
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("submit.title")}</h1>
  <p class="muted mt-2 max-w-2xl text-sm">{t("submit.lede")}</p>

  <div class="mt-6 grid gap-3 sm:grid-cols-3">
    <label class="text-sm">
      {t("submit.kind")}
      <select
        bind:value={kind}
        class="hairline mt-1 w-full rounded-md border bg-[var(--page)] px-3 py-2 text-sm"
      >
        <option value="pattern">pattern</option>
        <option value="group">group</option>
        <option value="config">config</option>
      </select>
    </label>
    <label class="text-sm">
      {t("submit.namespace")}
      <input
        bind:value={namespace}
        placeholder="alice"
        class="hairline mt-1 w-full rounded-md border bg-[var(--page)] px-3 py-2 font-mono text-sm"
      />
    </label>
    <label class="text-sm">
      {t("submit.name")}
      <input
        bind:value={name}
        placeholder="order-id"
        class="hairline mt-1 w-full rounded-md border bg-[var(--page)] px-3 py-2 font-mono text-sm"
      />
    </label>
  </div>

  <div class="mt-4 flex items-center justify-between">
    <label class="text-sm font-medium" for="manifest"
      >{t("submit.manifest")}</label
    >
    <button
      type="button"
      class="hairline rounded border px-2 py-1 text-xs"
      onclick={() => {
        manifest = EXAMPLE;
        namespace ||= "alice";
        name ||= "order-id";
      }}
    >
      {t("submit.load")}
    </button>
  </div>
  <textarea
    id="manifest"
    bind:value={manifest}
    rows="18"
    spellcheck="false"
    class="hairline mt-1 w-full rounded-md border bg-[var(--page)] p-3 font-mono text-[0.8rem]"
  ></textarea>

  <button
    type="button"
    class="mt-3 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    onclick={check}
    disabled={busy || manifest.trim() === "" || namespace === "" || name === ""}
  >
    {busy ? `${t("play.running")}…` : t("submit.check")}
  </button>

  {#if error}
    <p class="surface mt-4 rounded-lg p-3 text-sm" role="alert">{error}</p>
  {/if}

  {#if result}
    <section class="mt-6" aria-live="polite">
      <p class="text-sm">
        {t("submit.path")} <code class="font-mono">{result.path}</code>
      </p>

      {#if result.ok}
        <p class="accent mt-2 text-sm font-medium">{t("submit.ok")}</p>
        {#if result.pull_request_url}
          <a
            class="mt-3 inline-block rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            href={result.pull_request_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("submit.openPr")}
          </a>
        {/if}
      {/if}

      {#if result.findings.length > 0}
        <h2 class="mt-4 mb-2 text-sm font-semibold">{t("submit.findings")}</h2>
        <ul class="space-y-1.5">
          {#each result.findings as finding, index (index)}
            <li class="surface rounded-lg px-3 py-2 text-sm">
              <span
                class="me-2 font-mono text-xs uppercase"
                class:accent={finding.level === "error"}
                class:muted={finding.level !== "error"}
              >
                {finding.level}
              </span>
              <span>{finding.message}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <section class="mt-10">
    <h2 class="mb-2 text-sm font-semibold">{t("submit.load")}</h2>
    <Code code={EXAMPLE} language="toml" />
  </section>
</div>
