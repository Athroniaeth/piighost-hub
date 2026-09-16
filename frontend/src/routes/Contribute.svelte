<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import FilePlus from "@lucide/svelte/icons/file-plus";
  import GitFork from "@lucide/svelte/icons/git-fork";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import type { SubmissionResult } from "../generated/api";
  import ConfigComposition from "../components/ConfigComposition.svelte";
  import ConfigFields from "../components/ConfigFields.svelte";
  import KindIcon from "../components/KindIcon.svelte";
  import GroupFields from "../components/GroupFields.svelte";
  import GroupSources from "../components/GroupSources.svelte";
  import PatternExamples from "../components/PatternExamples.svelte";
  import PatternFields from "../components/PatternFields.svelte";
  import RefPicker from "../components/RefPicker.svelte";
  import Button from "../components/ui/Button.svelte";
  import CodeBlock from "../components/ui/CodeBlock.svelte";
  import Region from "../components/ui/Region.svelte";
  import { track } from "../lib/analytics";
  import { ApiError, api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { basedOn, blank, KINDS, type Kind } from "../lib/contribute";
  import { t, type Key } from "../lib/i18n.svelte";
  import {
    CONFIG_PLACEHOLDER,
    configDraftFrom,
    configProblems,
    configStarted,
    emptyConfigDraft,
    toConfigManifest,
    unsupported,
    type ConfigDraft,
  } from "../lib/config-draft";
  import {
    emptyGroupDraft,
    GROUP_PLACEHOLDER,
    groupDraftFrom,
    groupProblems,
    groupStarted,
    toGroupManifest,
    type GroupDraft,
  } from "../lib/group-draft";
  import {
    draftFrom,
    PLACEHOLDER,
    emptyDraft,
    problems,
    started,
    toManifest,
    type PatternDraft,
  } from "../lib/pattern-draft";
  import { FIELD_MONO, TEXTAREA } from "../lib/ui";

  let kind = $state<Kind>("pattern");
  let namespace = $state("piighost");
  let name = $state("");
  let base = $state("piighost/email");
  let manifest = $state("");
  let draft = $state<PatternDraft>(emptyDraft());
  let group = $state<GroupDraft>(emptyGroupDraft());
  let config = $state<ConfigDraft>(emptyConfigDraft());
  // Why the editor is showing instead of the form, when it is.
  let cannotForm = $state<string[]>([]);
  let labelPinned = $state(false);
  let result = $state<SubmissionResult | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);
  let loading = $state(false);

  // All three are written as forms. A configuration falls back to the editor
  // for the shapes the form has no field for, a detector with a model or a
  // stage outside the three standard ones, rather than dropping them quietly.
  const asForm = $derived(cannotForm.length === 0);
  // A form nobody has touched is not a form with eight faults, so the list
  // waits for the first keystroke, in the draft or in the name above it.
  const found = $derived(
    !asForm
      ? []
      : kind === "pattern"
        ? problems(draft)
        : kind === "group"
          ? groupProblems(group)
          : configProblems(config),
  );
  const touched = $derived(
    kind === "pattern"
      ? started(draft)
      : kind === "group"
        ? groupStarted(group)
        : configStarted(config),
  );
  const showing = $derived(found.length > 0 && (touched || name !== ""));
  const body = $derived(
    !asForm
      ? manifest
      : kind === "pattern"
        ? toManifest(draft)
        : kind === "group"
          ? toGroupManifest(group)
          : toConfigManifest(config),
  );
  const ready = $derived(
    namespace !== "" && name !== "" && body.trim() !== "" && found.length === 0,
  );

  /** The kind drives the base too: a config extends a config, not a pattern. */
  function pickKind(next: Kind) {
    kind = next;
    // Each kind starts from its own form again, so a configuration the editor
    // had to hold does not keep the editor open for the next one.
    cannotForm = [];
    base =
      next === "pattern"
        ? "piighost/email"
        : `piighost/${next === "group" ? "generic" : "fr-default"}`;
  }

  // The name is the manifest's too, so the form follows the field above it.
  $effect(() => {
    if (kind === "pattern" && name !== "" && draft.name === "")
      draft.name = name;
  });

  function start(text: string) {
    manifest = text;
    result = null;
    error = null;
  }

  async function fork() {
    const [namespaceOf, object] = base.split("/");
    loading = true;
    error = null;
    try {
      // The frozen commit rather than the manifest: it is already parsed, so
      // the form is filled by Python's reading of the file and not by a second
      // TOML parser written in the browser.
      const commit = await api.commit({
        namespace: namespaceOf,
        name: object,
        selector: "latest",
      });
      // A configuration can hold things this form has no field for. Dropping
      // them would hand back a manifest missing a piece its author never chose
      // to remove, so the editor takes it whole and says which piece.
      cannotForm = kind === "config" ? unsupported(commit) : [];
      if (!asForm) {
        start(basedOn(kind, name, await api.manifest(namespaceOf, object)));
      } else if (kind === "pattern") {
        draft = draftFrom(commit);
        labelPinned = true;
        if (name === "") name = draft.name;
      } else if (kind === "group") {
        group = groupDraftFrom(commit);
        if (name === "") name = group.name;
      } else {
        config = configDraftFrom(commit);
        if (name === "") name = config.name;
      }
      result = null;
      track({ name: "submission_forked", props: { kind } });
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
    } finally {
      loading = false;
    }
  }

  /** The picker and the button that fills either the form or the editor. */
  const forkNote = $derived(
    asForm ? t("contribute.fork.draft") : t(`contribute.fork.${kind}` as Key),
  );

  async function check() {
    busy = true;
    error = null;
    try {
      result = await api.submit({ kind, namespace, name, manifest: body });
      track({
        name: "submission_checked",
        props: {
          kind,
          mode: asForm ? "form" : "toml",
          ok: result.ok,
          findings: result.findings.length,
        },
      });
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
      result = null;
    } finally {
      busy = false;
    }
  }
</script>

<div class="mx-auto flex w-full max-w-[88rem] flex-col gap-4 p-4">
  <div class="flex flex-wrap items-baseline gap-x-3">
    <h1 class="text-xl font-semibold tracking-tight">{t("nav.contribute")}</h1>
    <p class="text-sm text-muted-foreground">{t("contribute.lede")}</p>
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
    class="grid divide-y overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100dvh-18rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0"
  >
    <Region
      step={1}
      done={namespace !== "" && name !== ""}
      title={asForm ? t("draft.identity") : t("contribute.start")}
      bodyClass="gap-3 overflow-y-auto"
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
            placeholder={kind === "pattern"
              ? PLACEHOLDER.name
              : kind === "group"
                ? GROUP_PLACEHOLDER.name
                : CONFIG_PLACEHOLDER.name}
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
        <p class="text-xs text-muted-foreground">{forkNote}</p>
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

      {#if !asForm}
        <div class="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
          {t("draft.unsupported")}
          <ul class="mt-1 space-y-0.5 font-mono">
            {#each cannotForm as reason (reason)}
              <li>{reason}</li>
            {/each}
          </ul>
        </div>
        <Button
          variant="outline"
          size="sm"
          onclick={() => start(blank(kind, name))}
        >
          <FilePlus />
          {t("contribute.blank")}
        </Button>
      {:else if kind === "pattern"}
        <PatternFields bind:draft bind:labelPinned {name} />
      {:else if kind === "group"}
        <GroupFields bind:draft={group} {name} />
      {:else}
        <ConfigFields bind:draft={config} {name} />
      {/if}
    </Region>

    <Region
      step={2}
      done={body.trim() !== ""}
      title={!asForm
        ? t("contribute.manifest")
        : kind === "pattern"
          ? t("draft.examples")
          : kind === "group"
            ? t("draft.sources")
            : t("draft.detectors")}
    >
      {#if !asForm}
        <textarea
          bind:value={manifest}
          spellcheck="false"
          aria-label={t("contribute.manifest")}
          class="{TEXTAREA} flex-1"></textarea>
      {:else if kind === "pattern"}
        <PatternExamples bind:draft />
      {:else if kind === "group"}
        <GroupSources bind:draft={group} />
      {:else}
        <ConfigComposition bind:draft={config} />
      {/if}
    </Region>

    <Region
      step={3}
      done={Boolean(result?.ok)}
      title={t("contribute.findings")}
      bodyClass="gap-3 overflow-y-auto"
    >
      <Button onclick={check} disabled={busy || !ready}>
        {#if busy}<Loader class="animate-spin" />{/if}
        {busy ? t("play.running") : t("contribute.check")}
      </Button>
      {#if error}<p class="text-xs text-destructive">{error}</p>{/if}

      {#if showing}
        <ul class="space-y-1.5">
          {#each found as problem (problem.field + problem.message)}
            <li class="rounded-md bg-muted/40 p-2 text-sm">
              {t(`draft.${problem.message}` as Key)}
            </li>
          {/each}
        </ul>
      {:else if result}
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
      {:else}
        <p class="text-sm text-muted-foreground">{t("contribute.empty")}</p>
      {/if}

      {#if asForm && body.trim() !== ""}
        <details>
          <summary class="cursor-pointer text-xs text-muted-foreground">
            {t("draft.preview")}
          </summary>
          <CodeBlock code={body} language="toml" class="mt-2 max-h-64" />
        </details>
      {/if}
    </Region>
  </div>
</div>
