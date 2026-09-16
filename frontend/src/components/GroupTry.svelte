<script lang="ts">
  import Loader from "@lucide/svelte/icons/loader-circle";
  import Play from "@lucide/svelte/icons/play";
  import Button from "./ui/Button.svelte";
  import EntityHighlight from "./EntityHighlight.svelte";
  import EntityRow from "./EntityRow.svelte";
  import type { GroupDraft } from "../lib/group-draft";
  import { ApiError, api } from "../lib/api";
  import { assignLabelColors } from "../lib/labels";
  import { t } from "../lib/i18n.svelte";
  import { engine, run, type Hit } from "../lib/pyodide.svelte";
  import { TEXTAREA } from "../lib/ui";

  /**
   * Try the group being written, without publishing it and without sending the
   * text anywhere.
   *
   * Two halves, split where the privacy argument is. Flattening the sources is
   * the registry's own rule, so the API does it and there is one implementation
   * of what happens when two sources carry one label. Running the result is
   * piighost itself, compiled to WebAssembly in this tab, so the text a visitor
   * pastes to see whether their group works never leaves the machine.
   */
  let { draft }: { draft: GroupDraft } = $props();

  let text = $state(
    "Write to john.doe@example.com or call +33 6 39 98 12 34. Card 4111 1111 1111 1111.",
  );
  let hits = $state<Hit[] | null>(null);
  let elapsed = $state(0);
  let error = $state<string | null>(null);
  let busy = $state(false);

  const ready = $derived(draft.sources.some((source) => source.ref !== ""));
  const colors = $derived(
    assignLabelColors((hits ?? []).map((hit) => hit.label)),
  );

  async function go() {
    busy = true;
    error = null;
    try {
      const catalogue = await api.preview(
        draft.sources
          .filter((source) => source.ref !== "")
          .map((source) => ({ ref: source.ref, exclude: source.exclude })),
      );
      const patterns = Object.fromEntries(
        catalogue.labels.map((entry) => [entry.label, entry.regex]),
      );
      const answer = await run(patterns, text);
      hits = answer.hits;
      elapsed = answer.elapsedMs;
    } catch (caught) {
      error = caught instanceof ApiError ? caught.message : String(caught);
      hits = null;
    } finally {
      busy = false;
    }
  }
</script>

<section class="flex min-h-0 flex-col gap-2">
  <div class="flex items-center gap-2">
    <h3 class="text-sm font-medium">{t("try.title")}</h3>
    <Button
      variant="outline"
      size="sm"
      class="ms-auto"
      disabled={busy || !ready}
      onclick={go}
    >
      {#if busy}<Loader class="animate-spin" />{:else}<Play />{/if}
      {busy && !engine.ready ? t("try.loading") : t("try.go")}
    </Button>
  </div>

  <p class="text-xs text-muted-foreground">{t("try.note")}</p>

  {#if hits}
    <div class="rounded-lg border bg-muted/30 p-3 text-sm">
      <EntityHighlight
        {text}
        hits={hits.map((hit) => ({
          ...hit,
          kept: true,
          detector: "regex",
          pattern: null,
        }))}
        {colors}
      />
    </div>
    <p class="text-xs text-muted-foreground tabular-nums">
      {hits.length}
      {t("try.caught")} · {elapsed.toFixed(1)} ms
    </p>
    <ul class="space-y-1.5 overflow-y-auto">
      {#each hits as hit, index (index)}
        <EntityRow label={hit.label} text={hit.text} {colors} />
      {/each}
    </ul>
    <Button
      variant="ghost"
      size="sm"
      class="self-start"
      onclick={() => (hits = null)}>{t("play.edit")}</Button
    >
  {:else}
    <textarea
      bind:value={text}
      spellcheck="false"
      aria-label={t("try.text")}
      class="{TEXTAREA} min-h-24"></textarea>
  {/if}

  {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
</section>
