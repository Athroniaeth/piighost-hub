<script lang="ts">
  import Download from "@lucide/svelte/icons/download";
  import Play from "@lucide/svelte/icons/play";
  import type {
    CommitDetail,
    ObjectDetail,
    Resolved,
    ScoreOut,
  } from "../generated/api";
  import Async from "../components/Async.svelte";
  import EntityLabel from "../components/EntityLabel.svelte";
  import EntityRow from "../components/EntityRow.svelte";
  import Badge from "../components/ui/Badge.svelte";
  import Button from "../components/ui/Button.svelte";
  import Card from "../components/ui/Card.svelte";
  import CodeBlock from "../components/ui/CodeBlock.svelte";
  import Segmented from "../components/ui/Segmented.svelte";
  import { ApiError, api, download } from "../lib/api";
  import { segments } from "../lib/highlight";
  import { i18n, t } from "../lib/i18n.svelte";
  import { assignLabelColors, labelStyle } from "../lib/labels";
  import { refPath, router } from "../lib/router.svelte";
  import { FIELD } from "../lib/ui";

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

  // Secondary loads: a failure must not blank the page.
  const score = $derived(api.score(ref).catch(() => null));
  const snippets = $derived(api.snippets(ref).catch(() => null));

  let form = $state<"flattened" | "referenced">("flattened");
  let memory = $state<"" | "in_memory" | "redis" | "sqlalchemy">("");
  const pipeline = $derived(
    api
      .pipeline(ref, {
        memory: memory || undefined,
        keepRefs: form === "referenced",
      })
      .catch(
        (caught: unknown) =>
          `# ${caught instanceof ApiError ? caught.message : caught}`,
      ),
  );

  let snippet = $state<string>("cli");
  let diffAgainst = $state("");
  let diffResult = $state<Awaited<ReturnType<typeof api.diff>> | null>(null);

  const formOptions = $derived([
    { value: "flattened" as const, label: t("detail.flattened") },
    { value: "referenced" as const, label: t("detail.referenced") },
  ]);

  async function runDiff() {
    if (diffAgainst)
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

  function exampleParts(text: string, value: string, label: string) {
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

  /** `placeholder.type=label_counter, threshold=0.85`: the leaves of a stage. */
  function describeStage(value: unknown, prefix = ""): string {
    if (value === null || typeof value !== "object")
      return `${prefix}${String(value)}`;
    return Object.entries(value as Record<string, unknown>)
      .map(([key, inner]) =>
        typeof inner === "object" && inner !== null
          ? describeStage(inner, `${prefix}${key}.`)
          : `${prefix}${key}=${String(inner)}`,
      )
      .join(", ");
  }

  function kindName(kind: string) {
    return kind === "pattern"
      ? t("kind.pattern")
      : kind === "group"
        ? t("kind.group")
        : t("kind.config");
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
    {@const colors = assignLabelColors(
      resolved.labels?.map((e) => e.label) ??
        resolved.detectors?.flatMap(
          (d) => d.labels?.map((e) => e.label) ?? [],
        ) ??
        [],
    )}
    <div class="mx-auto max-w-6xl px-4 py-8">
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div class="min-w-0">
          <p class="font-mono text-sm text-muted-foreground">
            {object.namespace} /
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="font-mono text-3xl font-bold tracking-tight">
              {object.name}
            </h1>
            <Badge variant="outline">{kindName(object.kind)}</Badge>
            <Badge variant="secondary" class="font-mono">{commit.commit}</Badge>
          </div>
          <p class="mt-3 max-w-3xl text-muted-foreground">
            {i18n.pick(object.description)}
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-1.5">
            {#each object.tags as tag (tag)}
              <Badge variant="outline" href="/?tag={encodeURIComponent(tag)}"
                >{tag}</Badge
              >
            {/each}
            {#each Object.entries(object.pointers) as [pointer, at] (pointer)}
              <Badge
                variant="secondary"
                href={refPath(`${object.key}:${pointer}`)}
                class="font-mono"
              >
                {pointer} → {at}
              </Badge>
            {/each}
          </div>
        </div>
        <div class="no-print flex shrink-0 flex-wrap gap-2">
          <Button href="/playground?ref={encodeURIComponent(object.key)}">
            <Play />
            {t("detail.openPlayground")}
          </Button>
          <Button variant="outline" onclick={savePipeline}>
            <Download />
            {t("detail.download")}
          </Button>
        </div>
      </header>

      <div
        class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
      >
        <div class="flex flex-col gap-6">
          {#if object.kind === "pattern"}
            <Card title={t("detail.pattern")} bodyClass="space-y-2">
              <CodeBlock
                code={String(commit.content.regex)}
                language="regex"
                wrap
              />
              <p class="text-xs text-muted-foreground">
                {t("detail.engine")} · <EntityLabel
                  label={String(commit.content.label)}
                  {colors}
                />
              </p>
            </Card>
            {#if commit.content.examples}
              {@const examples = commit.content.examples as {
                match: { text: string; value: string }[];
                no_match: { text: string }[];
              }}
              <div class="grid gap-6 sm:grid-cols-2">
                <Card title={t("detail.matches")}>
                  <ul class="space-y-1.5">
                    {#each examples.match as example, index (index)}
                      <li
                        class="rounded-md bg-muted/40 p-2 font-mono text-sm leading-relaxed"
                      >
                        {#each exampleParts(example.text, example.value, String(commit.content.label)) as part, i (i)}{#if part.hit}<span
                              class="rounded px-1 {labelStyle(
                                part.hit.label,
                                colors,
                              )}">{part.text}</span
                            >{:else}{part.text}{/if}{/each}
                      </li>
                    {/each}
                  </ul>
                </Card>
                <Card title={t("detail.noMatches")}>
                  <ul class="space-y-1.5">
                    {#each examples.no_match as example, index (index)}
                      <li
                        class="rounded-md bg-muted/40 p-2 font-mono text-sm text-muted-foreground"
                      >
                        {example.text}
                      </li>
                    {/each}
                  </ul>
                </Card>
              </div>
            {/if}
          {/if}

          {#if object.kind === "group" && Array.isArray(commit.content.sources)}
            <Card title={t("detail.sources")} bodyClass="space-y-2">
              <ol class="space-y-1.5">
                {#each commit.content.sources as source, index (index)}
                  {@const entry = source as {
                    ref: string;
                    commit: string;
                    exclude: string[];
                    only: string[];
                  }}
                  <li
                    class="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2 text-sm"
                  >
                    <span
                      class="grid size-5 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary tabular-nums"
                      >{index + 1}</span
                    >
                    <a
                      class="font-mono hover:underline"
                      href={refPath(entry.ref)}>{entry.ref}</a
                    >
                    <span class="font-mono text-xs text-muted-foreground"
                      >:{entry.commit}</span
                    >
                    {#if entry.exclude.length > 0}
                      <span class="text-xs text-muted-foreground"
                        >{t("detail.excluded")} {entry.exclude.join(", ")}</span
                      >
                    {/if}
                    {#if entry.only.length > 0}
                      <span class="text-xs text-muted-foreground"
                        >{t("detail.only")} {entry.only.join(", ")}</span
                      >
                    {/if}
                  </li>
                {/each}
              </ol>
              <p class="text-xs text-muted-foreground">
                {t("detail.sourcesNote")}
              </p>
            </Card>
          {/if}

          {#if resolved.detectors}
            <Card title={t("detail.detectors")}>
              <ol class="space-y-2">
                {#each resolved.detectors as detector (detector.name)}
                  <li class="rounded-md bg-muted/40 p-3">
                    <div class="flex flex-wrap items-baseline gap-2">
                      <span class="font-medium">{detector.name}</span>
                      <span class="font-mono text-xs text-muted-foreground"
                        >{detector.type}</span
                      >
                      {#each detector.groups as group (group)}
                        <a
                          class="font-mono text-xs hover:underline"
                          href={refPath(group)}>{group}</a
                        >
                      {/each}
                    </div>
                    {#if detector.labels}
                      <p class="mt-2 flex flex-wrap gap-1">
                        {#each detector.labels as entry (entry.label)}<EntityLabel
                            label={entry.label}
                            {colors}
                          />{/each}
                      </p>
                    {/if}
                  </li>
                {/each}
              </ol>
            </Card>
          {/if}

          {#if resolved.stages && Object.keys(resolved.stages).length > 0}
            <Card title={t("detail.stages")}>
              <ul class="flex flex-wrap gap-1.5">
                {#each Object.entries(resolved.stages) as [stage, value] (stage)}
                  <li class="rounded-md border px-2 py-1 font-mono text-xs">
                    <span class="font-semibold">{stage}</span>
                    <span class="text-muted-foreground"
                      >{describeStage(value)}</span
                    >
                  </li>
                {/each}
              </ul>
            </Card>
          {/if}

          {#if resolved.labels && object.kind !== "pattern"}
            <Card title={t("detail.labels")}>
              <ul class="space-y-1.5">
                {#each resolved.labels as entry (entry.label)}
                  <EntityRow label={entry.label} text={entry.regex} {colors}>
                    {#snippet trailing()}
                      <a
                        href={refPath(entry.pattern)}
                        class="font-mono hover:underline"
                        >{entry.pattern.split("/")[1]}</a
                      >
                    {/snippet}
                  </EntityRow>
                {/each}
              </ul>
            </Card>
          {/if}

          <Card title={t("detail.coverage")}>
            <Async promise={score}>
              {#snippet children(value: ScoreOut | null)}
                {#if !value || value.annotated === 0}
                  <p class="text-sm text-muted-foreground">
                    {t("detail.noCoverage")}
                  </p>
                {:else}
                  <dl
                    class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm"
                  >
                    <dt>{t("detail.exact")}</dt>
                    <dd class="text-end tabular-nums">
                      {value.exact} / {value.annotated}
                    </dd>
                    <dt>{t("detail.mislabelled")}</dt>
                    <dd class="text-end tabular-nums">{value.mislabelled}</dd>
                    <dt>{t("detail.missed")}</dt>
                    <dd class="text-end tabular-nums">{value.missed}</dd>
                    <dt>{t("detail.extra")}</dt>
                    <dd class="text-end tabular-nums">{value.extra}</dd>
                  </dl>
                  <p class="mt-3 text-xs text-muted-foreground">
                    {value.scope === "labels"
                      ? t("detail.scopeLabels")
                      : t("detail.scopeCorpus")}
                    {t("detail.scoreHelp")}
                  </p>
                {/if}
              {/snippet}
            </Async>
          </Card>

          <Card
            title={t("detail.commits")}
            class="no-print"
            bodyClass="space-y-3"
          >
            <ul class="space-y-1.5">
              {#each object.commits as entry (entry.commit)}
                <li
                  class="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm"
                >
                  <a
                    class="font-mono hover:underline"
                    href={refPath(`${object.key}:${entry.commit}`)}
                    >{entry.commit}</a
                  >
                  <span class="text-xs text-muted-foreground tabular-nums"
                    >{entry.recorded_at?.slice(0, 10) ?? "—"}</span
                  >
                </li>
              {/each}
            </ul>
            {#if object.commits.length > 1}
              <div class="flex items-center gap-2">
                <select
                  bind:value={diffAgainst}
                  class="{FIELD} font-mono"
                  aria-label={t("detail.diff")}
                >
                  <option value="">{t("detail.diff")}</option>
                  {#each object.commits as entry (entry.commit)}
                    <option value={entry.commit}>{entry.commit}</option>
                  {/each}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={runDiff}
                  disabled={!diffAgainst}>{t("detail.diff")}</Button
                >
              </div>
            {/if}
            {#if diffResult}
              {#if !diffResult.behavioural}
                <p class="text-xs text-muted-foreground">
                  {t("detail.diffNone")}
                </p>
              {:else}
                <ul class="space-y-1 font-mono text-xs">
                  {#each diffResult.changes as change, index (index)}
                    <li class="rounded-md bg-muted/40 p-2">
                      {change.text}
                      <span class="text-muted-foreground"
                        >{change.before ?? "—"} → {change.after ?? "—"} · {change.sample}</span
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
            {/if}
          </Card>
        </div>

        <div class="flex flex-col gap-6">
          <Card title={t("detail.pipeline")} bodyClass="space-y-3">
            {#snippet action()}
              <Segmented
                options={formOptions}
                bind:value={form}
                label={t("detail.pipeline")}
              />
            {/snippet}
            <label
              class="no-print flex items-center gap-2 text-xs text-muted-foreground"
            >
              {t("detail.memory")}
              <select bind:value={memory} class="{FIELD} w-auto">
                <option value="">{t("detail.none")}</option>
                <option value="in_memory">in_memory</option>
                <option value="redis">redis</option>
                <option value="sqlalchemy">sqlalchemy</option>
              </select>
            </label>
            {#await pipeline then body}
              <CodeBlock code={body} language="toml" />
            {/await}
          </Card>

          <Async promise={snippets}>
            {#snippet children(value)}
              {#if value}
                <Card
                  title={t("detail.use")}
                  bodyClass="space-y-3"
                  class="no-print"
                >
                  {#snippet action()}
                    <Segmented
                      options={Object.keys(value.items).map((k) => ({
                        value: k,
                        label: k,
                      }))}
                      bind:value={snippet}
                      label={t("detail.use")}
                    />
                  {/snippet}
                  <CodeBlock
                    code={value.items[snippet] ?? Object.values(value.items)[0]}
                  />
                </Card>
              {/if}
            {/snippet}
          </Async>

          {#if object.kind !== "config"}
            <Card title={t("detail.export")} class="no-print">
              <div class="flex flex-wrap gap-2">
                {#each ["json", "presidio", "spacy"] as const as format (format)}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => saveExport(format)}>{format}</Button
                  >
                {/each}
              </div>
            </Card>
          {/if}
        </div>
      </div>
    </div>
  {/snippet}
</Async>
