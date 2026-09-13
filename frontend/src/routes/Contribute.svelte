<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import type { SubmissionResult } from "../generated/api";
  import Button from "../components/ui/Button.svelte";
  import Region from "../components/ui/Region.svelte";
  import { ApiError, api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { t } from "../lib/i18n.svelte";
  import { FIELD, FIELD_MONO, TEXTAREA } from "../lib/ui";

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

  const ready = $derived(
    manifest.trim() !== "" && namespace !== "" && name !== "",
  );

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

<div
  class="mx-auto flex w-full max-w-[88rem] flex-col p-4 lg:h-[calc(100dvh-4rem)]"
>
  <div class="mb-3 shrink-0">
    <h1 class="text-xl font-semibold tracking-tight">{t("nav.contribute")}</h1>
    <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
      {t("contribute.lede")}
    </p>
  </div>
  <div
    class="grid flex-1 divide-y overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.9fr)_minmax(0,1.05fr)] lg:divide-x lg:divide-y-0"
  >
    <Region step={1} done={ready} title={t("play.configure")} bodyClass="gap-3">
      <label class="flex flex-col gap-1 text-sm font-medium">
        {t("contribute.kind")}
        <select bind:value={kind} class={FIELD}>
          <option value="pattern">pattern</option>
          <option value="group">group</option>
          <option value="config">config</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        {t("contribute.namespace")}
        <input
          bind:value={namespace}
          placeholder="alice"
          spellcheck="false"
          class={FIELD_MONO}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        {t("contribute.name")}
        <input
          bind:value={name}
          placeholder="order-id"
          spellcheck="false"
          class={FIELD_MONO}
        />
      </label>
      <Button
        variant="outline"
        size="sm"
        class="self-start"
        onclick={() => {
          manifest = EXAMPLE;
          namespace ||= "alice";
          name ||= "order-id";
        }}
      >
        {t("contribute.example")}
      </Button>
      <div class="mt-auto flex flex-col gap-2 pt-2">
        <Button onclick={check} disabled={busy || !ready}>
          {#if busy}<Loader class="animate-spin" />{/if}
          {busy ? t("play.running") : t("contribute.check")}
        </Button>
        {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
      </div>
    </Region>

    <Region
      step={2}
      done={manifest.trim() !== ""}
      title={t("contribute.manifest")}
    >
      <textarea
        bind:value={manifest}
        spellcheck="false"
        aria-label={t("contribute.manifest")}
        class="{TEXTAREA} flex-1"></textarea>
    </Region>

    <Region
      step={3}
      done={Boolean(result?.ok)}
      title={t("contribute.findings")}
      bodyClass="gap-3"
    >
      {#if !result}
        <p class="text-sm text-muted-foreground">{t("contribute.empty")}</p>
      {:else}
        <p class="text-xs text-muted-foreground">
          {t("contribute.path")}
          <code class="font-mono text-foreground">{result.path}</code>
        </p>
        {#if result.ok}
          <p class="text-sm font-medium text-primary">{t("contribute.ok")}</p>
          {#if result.pull_request_url}
            <Button
              href={result.pull_request_url}
              target="_blank"
              rel="noopener noreferrer"
              class="self-start"
            >
              {t("contribute.openPr")}
              <ExternalLink />
            </Button>
          {/if}
        {/if}
        {#if result.findings.length > 0}
          <ul class="space-y-1.5">
            {#each result.findings as finding, index (index)}
              <li class="rounded-md bg-muted/40 p-2 text-sm">
                <span
                  class={cn(
                    "me-2 font-mono text-xs uppercase",
                    finding.level === "error"
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {finding.level}
                </span>
                {finding.message}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </Region>
  </div>
</div>
