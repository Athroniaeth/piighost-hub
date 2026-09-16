<script lang="ts">
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import GitFork from "@lucide/svelte/icons/git-fork";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import type { SubmissionResult } from "../generated/api";
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
  import { t, type Key } from "../lib/i18n.svelte";
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
  import { FIELD_MONO } from "../lib/ui";

  /**
   * A pattern and a group, each written as a form.
   *
   * A configuration was here too and was taken out: assembling detectors and
   * pipeline stages is a bigger interface than a form, and the plan is to reach
   * it through a conversation rather than a grid of pickers. The form that
   * existed is complete and tested, at the tag `config-form/v1`.
   */
  type Kind = "pattern" | "group";

  const KINDS: Kind[] = ["pattern", "group"];

  let kind = $state<Kind>("pattern");
  let namespace = $state("piighost");
  let name = $state("");
  let base = $state("piighost/email");
  let draft = $state<PatternDraft>(emptyDraft());
  let group = $state<GroupDraft>(emptyGroupDraft());
  let labelPinned = $state(false);
  let result = $state<SubmissionResult | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);
  let loading = $state(false);

  // A form nobody has touched is not a form with eight faults, so the list
  // waits for the first keystroke, in the draft or in the name above it.
  const found = $derived(
    kind === "pattern" ? problems(draft) : groupProblems(group),
  );
  const touched = $derived(
    kind === "pattern" ? started(draft) : groupStarted(group),
  );
  const showing = $derived(found.length > 0 && (touched || name !== ""));
  const body = $derived(
    kind === "pattern" ? toManifest(draft) : toGroupManifest(group),
  );
  const ready = $derived(
    namespace !== "" && name !== "" && body.trim() !== "" && found.length === 0,
  );

  /** The kind drives the base too: a group is composed of groups and patterns. */
  function pickKind(next: Kind) {
    kind = next;
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
      if (kind === "pattern") {
        draft = draftFrom(commit);
        labelPinned = true;
        if (name === "") name = draft.name;
      } else {
        group = groupDraftFrom(commit);
        if (name === "") name = group.name;
      }
      result = null;
      track({ name: "submission_forked", props: { kind } });
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
      result = await api.submit({ kind, namespace, name, manifest: body });
      track({
        name: "submission_checked",
        props: { kind, ok: result.ok, findings: result.findings.length },
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
    <div class="grid gap-3 sm:grid-cols-2">
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
      title={t("draft.identity")}
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
              : GROUP_PLACEHOLDER.name}
            spellcheck="false"
            class={FIELD_MONO}
          />
        </label>
      </div>

      <div class="space-y-2 rounded-lg bg-muted/40 p-2">
        <RefPicker
          id="contribute-base"
          bind:value={base}
          kinds={[kind]}
          label={t("contribute.base")}
        />
        <p class="text-xs text-muted-foreground">
          {t("contribute.fork.draft")}
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

      {#if kind === "pattern"}
        <PatternFields bind:draft bind:labelPinned {name} />
      {:else}
        <GroupFields bind:draft={group} {name} />
      {/if}
    </Region>

    <Region
      step={2}
      done={body.trim() !== ""}
      title={kind === "pattern" ? t("draft.examples") : t("draft.sources")}
    >
      {#if kind === "pattern"}
        <PatternExamples bind:draft />
      {:else}
        <GroupSources bind:draft={group} />
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

      {#if body.trim() !== ""}
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
