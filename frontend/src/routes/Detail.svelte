<script lang="ts">
  import type {
    CommitDetail,
    ObjectDetail,
    Resolved,
    ScoreOut,
  } from "../generated/api";
  import Async from "../components/Async.svelte";
  import Code from "../components/Code.svelte";
  import KindBadge from "../components/KindBadge.svelte";
  import TagChip from "../components/TagChip.svelte";
  import { ApiError, api, download } from "../lib/api";
  import { labelClass, segments } from "../lib/highlight";
  import { i18n, t } from "../lib/i18n.svelte";
  import { refPath, router } from "../lib/router.svelte";

  let {
    namespace,
    name,
    selector = "latest",
  }: { namespace: string; name: string; selector?: string } = $props();

  const ref = $derived({ namespace, name, selector });

  const bundle = $derived(
    (async () => {
      const [object, commit, resolved] = await Promise.all([
        api.object(namespace, name),
        api.commit(ref),
        api.resolved(ref),
      ]);
      return { object, commit, resolved };
    })(),
  );

  // Coverage and snippets are secondary: a failure there must not blank the page.
  const score = $derived(api.score(ref).catch(() => null));
  const snippets = $derived(api.snippets(ref).catch(() => null));

  let memory = $state<"" | "in_memory" | "redis" | "sqlalchemy">("");
  let keepRefs = $state(false);
  const pipeline = $derived(
    api
      .pipeline(ref, { memory: memory || undefined, keepRefs })
      .catch(
        (caught: unknown) =>
          `# ${caught instanceof ApiError ? caught.message : caught}`,
      ),
  );

  let diffAgainst = $state("");
  let diffResult = $state<Awaited<ReturnType<typeof api.diff>> | null>(null);

  async function runDiff() {
    if (!diffAgainst) return;
    diffResult = await api.diff(namespace, name, diffAgainst, selector);
  }

  async function saveExport(format: "json" | "presidio" | "spacy") {
    const body = await api.exported(ref, format);
    const extension =
      format === "json" ? "json" : format === "presidio" ? "py" : "jsonl";
    download(`${name}-${format}.${extension}`, body, "text/plain");
  }

  async function savePipeline() {
    download(`${name}-pipeline.toml`, await pipeline, "application/toml");
  }

  function exampleSegments(text: string, value: string, label: string) {
    const start = text.indexOf(value);
    if (start < 0) return segments(text, []);
    return segments(text, [
      {
        start,
        end: start + value.length,
        label,
        kept: true,
        detector: "",
        pattern: null,
      },
    ]);
  }
</script>

<Async promise={bundle} onretry={() => router.go(router.path)}>
  {#snippet children({
    object,
    commit,
    resolved,
  }: {
    object: ObjectDetail;
    commit: CommitDetail;
    resolved: Resolved;
  })}
    <div class="mx-auto max-w-5xl px-4 py-8">
      <header>
        <div class="flex flex-wrap items-baseline gap-2">
          <h1 class="text-2xl font-semibold tracking-tight">{object.key}</h1>
          <KindBadge kind={object.kind} />
          <code class="muted font-mono text-sm">:{commit.commit}</code>
        </div>
        <p class="mt-2 max-w-3xl">{i18n.pick(object.description)}</p>

        <ul class="mt-3 flex flex-wrap gap-1.5">
          {#each object.tags as tag (tag)}
            <li>
              <TagChip {tag} href="/browse?tag={encodeURIComponent(tag)}" />
            </li>
          {/each}
        </ul>

        <ul class="mt-3 flex flex-wrap gap-1.5 text-xs">
          {#each Object.entries(object.pointers) as [pointer, at] (pointer)}
            <li class="hairline rounded border px-2 py-0.5 font-mono">
              <a href={refPath(`${object.key}:${pointer}`)}>{pointer} → {at}</a>
            </li>
          {/each}
        </ul>

        <p class="no-print mt-4 text-sm">
          <a
            class="accent underline"
            href="/playground?ref={encodeURIComponent(object.key)}"
          >
            {t("detail.openPlayground")}
          </a>
        </p>
      </header>

      {#if object.kind === "pattern"}
        <section class="mt-8">
          <h2 class="mb-2 text-sm font-semibold">{t("detail.regex")}</h2>
          <Code code={String(commit.content.regex)} language="regex" wrap />
          <p class="muted mt-2 text-xs">
            Python <code class="font-mono">re</code>,
            <code class="font-mono">re.ASCII</code>
            ·
            <code class="font-mono">{String(commit.content.label)}</code>
          </p>
        </section>

        {#if commit.content.examples}
          {@const examples = commit.content.examples as {
            match: { text: string; value: string }[];
            no_match: { text: string }[];
          }}
          <section class="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 class="mb-2 text-sm font-semibold">{t("detail.matches")}</h2>
              <ul class="space-y-2">
                {#each examples.match as example, index (index)}
                  <li
                    class="surface rounded-lg p-2 font-mono text-[0.8rem] leading-relaxed"
                  >
                    {#each exampleSegments(example.text, example.value, String(commit.content.label)) as part, partIndex (partIndex)}{#if part.hit}<mark
                          class="hl {labelClass(part.hit.label)}"
                          >{part.text}</mark
                        >{:else}{part.text}{/if}{/each}
                  </li>
                {/each}
              </ul>
            </div>
            <div>
              <h2 class="mb-2 text-sm font-semibold">
                {t("detail.noMatches")}
              </h2>
              <ul class="space-y-2">
                {#each examples.no_match as example, index (index)}
                  <li class="surface rounded-lg p-2 font-mono text-[0.8rem]">
                    {example.text}
                  </li>
                {/each}
              </ul>
            </div>
          </section>
        {/if}
      {/if}

      {#if object.kind === "group" && Array.isArray(commit.content.sources)}
        <section class="mt-8">
          <h2 class="mb-2 text-sm font-semibold">{t("detail.sources")}</h2>
          <ol class="space-y-1.5">
            {#each commit.content.sources as source, index (index)}
              {@const entry = source as {
                ref: string;
                commit: string;
                exclude: string[];
                only: string[];
              }}
              <li
                class="surface flex flex-wrap items-baseline gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <span class="muted tabular-nums">{index + 1}</span>
                <a class="font-mono underline" href={refPath(entry.ref)}
                  >{entry.ref}</a
                >
                <code class="muted font-mono text-xs">:{entry.commit}</code>
                {#if entry.exclude.length > 0}
                  <span class="muted text-xs">− {entry.exclude.join(", ")}</span
                  >
                {/if}
                {#if entry.only.length > 0}
                  <span class="muted text-xs">only {entry.only.join(", ")}</span
                  >
                {/if}
              </li>
            {/each}
          </ol>
          <p class="muted mt-2 text-xs">
            {t("detail.sources")} → {t("detail.labels")}: the order above is the
            order patterns are inserted, which is what settles two patterns
            claiming one span.
          </p>
        </section>
      {/if}

      {#if resolved.labels}
        <section class="mt-8">
          <h2 class="mb-2 text-sm font-semibold">{t("detail.labels")}</h2>
          <ul class="space-y-1.5">
            {#each resolved.labels as entry (entry.label)}
              <li class="surface rounded-lg px-3 py-2">
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="hl {labelClass(entry.label)} font-mono text-sm"
                    >{entry.label}</span
                  >
                  <span class="muted text-xs">{t("detail.provenance")}</span>
                  <a
                    class="font-mono text-xs underline"
                    href={refPath(entry.pattern)}
                  >
                    {entry.pattern}
                  </a>
                </div>
                <code class="mt-1 block overflow-x-auto font-mono text-xs muted"
                  >{entry.regex}</code
                >
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if resolved.detectors}
        <section class="mt-8">
          <h2 class="mb-2 text-sm font-semibold">{t("detail.detectors")}</h2>
          <ol class="space-y-2">
            {#each resolved.detectors as detector (detector.name)}
              <li class="surface rounded-lg p-3">
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="font-medium">{detector.name}</span>
                  <code class="muted font-mono text-xs">{detector.type}</code>
                  {#each detector.groups as group (group)}
                    <a class="font-mono text-xs underline" href={refPath(group)}
                      >{group}</a
                    >
                  {/each}
                </div>
                {#if detector.labels}
                  <p class="mt-1.5 flex flex-wrap gap-1">
                    {#each detector.labels as entry (entry.label)}
                      <span
                        class="hl {labelClass(entry.label)} font-mono text-xs"
                      >
                        {entry.label}
                      </span>
                    {/each}
                  </p>
                {/if}
              </li>
            {/each}
          </ol>
        </section>
      {/if}

      {#if resolved.stages && Object.keys(resolved.stages).length > 0}
        <section class="mt-8">
          <h2 class="mb-2 text-sm font-semibold">{t("detail.stages")}</h2>
          <ul class="flex flex-wrap gap-1.5 text-xs">
            {#each Object.entries(resolved.stages) as [stage, value] (stage)}
              <li class="hairline rounded border px-2 py-1 font-mono">
                {stage}: {JSON.stringify(value)}
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <section class="mt-8">
        <h2 class="mb-2 text-sm font-semibold">{t("detail.coverage")}</h2>
        <Async promise={score}>
          {#snippet children(value: ScoreOut | null)}
            {#if !value || value.annotated === 0}
              <p class="muted text-sm">{t("detail.noScore")}</p>
            {:else}
              <table class="w-full max-w-lg text-sm">
                <tbody>
                  <tr class="hairline border-b">
                    <td class="py-1">{t("detail.scoreExact")}</td>
                    <td class="py-1 text-end tabular-nums"
                      >{value.exact} / {value.annotated}</td
                    >
                  </tr>
                  <tr class="hairline border-b">
                    <td class="py-1">{t("detail.scoreMislabelled")}</td>
                    <td class="py-1 text-end tabular-nums"
                      >{value.mislabelled}</td
                    >
                  </tr>
                  <tr class="hairline border-b">
                    <td class="py-1">{t("detail.scoreMissed")}</td>
                    <td class="py-1 text-end tabular-nums">{value.missed}</td>
                  </tr>
                  <tr>
                    <td class="py-1">{t("detail.scoreExtra")}</td>
                    <td class="py-1 text-end tabular-nums">{value.extra}</td>
                  </tr>
                </tbody>
              </table>
              <p class="muted mt-2 max-w-2xl text-xs">
                {value.scope === "labels"
                  ? t("detail.scopeLabels")
                  : t("detail.scopeCorpus")}
                {t("detail.scoreHelp")}
              </p>
            {/if}
          {/snippet}
        </Async>
      </section>

      <section class="mt-8">
        <h2 class="mb-2 text-sm font-semibold">{t("detail.pipeline")}</h2>
        <div class="no-print mb-2 flex flex-wrap items-center gap-3 text-sm">
          <label class="flex items-center gap-1.5">
            <input type="checkbox" bind:checked={keepRefs} />
            {keepRefs ? t("detail.keepRefs") : t("detail.flatten")}
          </label>
          <label class="flex items-center gap-1.5">
            {t("detail.memory")}
            <select
              bind:value={memory}
              class="hairline rounded border bg-[var(--page)] px-2 py-1 text-xs"
            >
              <option value="">—</option>
              <option value="in_memory">in_memory</option>
              <option value="redis">redis</option>
              <option value="sqlalchemy">sqlalchemy</option>
            </select>
          </label>
          <button
            type="button"
            class="hairline rounded border px-2 py-1 text-xs"
            onclick={savePipeline}
          >
            {t("detail.download")}
          </button>
        </div>
        {#await pipeline then body}
          <Code code={body} language="toml" />
        {/await}
      </section>

      {#if object.kind !== "config"}
        <section class="no-print mt-8">
          <h2 class="mb-2 text-sm font-semibold">{t("detail.export")}</h2>
          <div class="flex flex-wrap gap-2">
            {#each ["json", "presidio", "spacy"] as const as format (format)}
              <button
                type="button"
                class="hairline rounded-md border px-3 py-1.5 text-sm"
                onclick={() => saveExport(format)}
              >
                {format}
              </button>
            {/each}
          </div>
        </section>
      {/if}

      <Async promise={snippets}>
        {#snippet children(value)}
          {#if value}
            <section class="no-print mt-8">
              <h2 class="mb-2 text-sm font-semibold">{t("detail.use")}</h2>
              <div class="space-y-3">
                {#each Object.entries(value.items) as [target, snippet] (target)}
                  <div>
                    <p class="muted mb-1 font-mono text-xs">{target}</p>
                    <Code code={snippet} />
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        {/snippet}
      </Async>

      <section class="no-print mt-8">
        <h2 class="mb-2 text-sm font-semibold">{t("detail.commits")}</h2>
        <ul class="space-y-1 text-sm">
          {#each object.commits as entry (entry.commit)}
            <li
              class="surface flex flex-wrap items-baseline gap-2 rounded px-3 py-1.5"
            >
              <a
                class="font-mono underline"
                href={refPath(`${object.key}:${entry.commit}`)}
              >
                {entry.commit}
              </a>
              <span class="muted text-xs">{entry.recorded_at ?? "—"}</span>
            </li>
          {/each}
        </ul>

        {#if object.commits.length > 1}
          <div class="mt-3 flex flex-wrap items-end gap-2">
            <label class="text-sm">
              {t("detail.diff")}
              <select
                bind:value={diffAgainst}
                class="hairline ms-2 rounded border bg-[var(--page)] px-2 py-1 text-xs"
              >
                <option value="">—</option>
                {#each object.commits as entry (entry.commit)}
                  <option value={entry.commit}>{entry.commit}</option>
                {/each}
              </select>
            </label>
            <button
              type="button"
              class="hairline rounded border px-2 py-1 text-xs"
              onclick={runDiff}
              disabled={!diffAgainst}
            >
              {t("detail.diff")}
            </button>
          </div>
        {/if}

        {#if diffResult}
          <div class="surface mt-3 rounded-lg p-3 text-sm">
            {#if !diffResult.behavioural}
              <p class="muted">= no change on the corpus</p>
            {:else}
              <ul class="space-y-1">
                {#each diffResult.changes as change, index (index)}
                  <li class="font-mono text-xs">
                    <code>{change.text}</code>
                    <span class="muted"
                      >{change.before ?? "—"} → {change.after ?? "—"}</span
                    >
                    <span class="muted">({change.sample})</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </section>
    </div>
  {/snippet}
</Async>
