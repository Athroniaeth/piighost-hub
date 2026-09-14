<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import FilePlus from "@lucide/svelte/icons/file-plus";
  import GitFork from "@lucide/svelte/icons/git-fork";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import type { SubmissionResult } from "../generated/api";
  import KindIcon from "../components/KindIcon.svelte";
  import RefPicker from "../components/RefPicker.svelte";
  import Button from "../components/ui/Button.svelte";
  import Region from "../components/ui/Region.svelte";
  import { ApiError, api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { basedOn, blank, KINDS, type Kind } from "../lib/contribute";
  import { t, type Key } from "../lib/i18n.svelte";
  import { FIELD_MONO, TEXTAREA } from "../lib/ui";

  let kind = $state<Kind>("config");
  let namespace = $state("");
  let name = $state("");
  let base = $state("piighost/fr-default");
  let manifest = $state("");
  let result = $state<SubmissionResult | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);
  let loading = $state(false);

  const ready = $derived(
    manifest.trim() !== "" && namespace !== "" && name !== "",
  );

  /** The kind drives the base too: a config extends a config, not a pattern. */
  function pickKind(next: Kind) {
    kind = next;
    base =
      next === "pattern"
        ? "piighost/email"
        : `piighost/${next === "group" ? "generic" : "fr-default"}`;
  }

  function start(text: string) {
    manifest = text;
    result = null;
    error = null;
  }

  async function fork() {
    const [ns, object] = base.split("/");
    loading = true;
    error = null;
    try {
      start(basedOn(kind, name, await api.manifest(ns, object)));
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
    } finally {
      loading = false;
    }
  }

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

<div class="mx-auto flex w-full max-w-[88rem] flex-col gap-4 p-4">
  <div>
    <h1 class="text-xl font-semibold tracking-tight">{t("nav.contribute")}</h1>
    <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
      {t("contribute.lede")}
    </p>
  </div>

  <fieldset>
    <legend class="mb-2 text-sm font-medium">{t("contribute.what")}</legend>
    <div class="grid gap-3 sm:grid-cols-3">
      {#each KINDS as option (option)}
        <button
          type="button"
          aria-pressed={kind === option}
          class={cn(
            "flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
            kind === option
              ? "border-primary ring-1 ring-primary"
              : "hover:bg-muted/50",
          )}
          onclick={() => pickKind(option)}
        >
          <KindIcon
            kind={option}
            class={cn(
              "mt-0.5 size-5 shrink-0",
              kind === option ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium capitalize"
              >{t(`kind.${option}` as Key)}</span
            >
            <span class="block text-xs text-muted-foreground"
              >{t(`contribute.${option}.note` as Key)}</span
            >
          </span>
        </button>
      {/each}
    </div>
  </fieldset>

  <div
    class="grid divide-y overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100dvh-20rem)] lg:min-h-[28rem] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.9fr)_minmax(0,1.05fr)] lg:divide-x lg:divide-y-0"
  >
    <Region
      step={1}
      done={ready}
      title={t("contribute.start")}
      bodyClass="gap-3"
    >
      <div class="grid grid-cols-2 gap-2">
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
      </div>

      <div class="space-y-2 rounded-lg bg-muted/40 p-2">
        <RefPicker
          id="contribute-base"
          bind:value={base}
          {kind}
          label={t("contribute.base")}
        />
        <p class="text-xs text-muted-foreground">
          {t(`contribute.fork.${kind}` as Key)}
        </p>
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          disabled={loading}
          onclick={fork}
        >
          {#if loading}<Loader class="animate-spin" />{:else}<GitFork />{/if}
          {t("contribute.fork")}
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onclick={() => start(blank(kind, name))}
      >
        <FilePlus />
        {t("contribute.blank")}
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
          <ul class="space-y-1.5 overflow-auto">
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
