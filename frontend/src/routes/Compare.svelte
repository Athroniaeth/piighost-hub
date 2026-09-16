<script lang="ts">
  import Loader from "@lucide/svelte/icons/loader-circle";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import type { CompareOut } from "../generated/api";
  import EntityHighlight from "../components/EntityHighlight.svelte";
  import PlaygroundShell from "../components/PlaygroundShell.svelte";
  import RefPicker from "../components/RefPicker.svelte";
  import SamplePicker from "../components/SamplePicker.svelte";
  import Button from "../components/ui/Button.svelte";
  import Region from "../components/ui/Region.svelte";
  import { ApiError, api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";
  import { refPath } from "../lib/router.svelte";
  import { assignLabelColors } from "../lib/labels";
  import { EYEBROW, TEXTAREA } from "../lib/ui";

  let refs = $state<string[]>([
    "piighost/regex-default",
    "piighost/fr-default",
  ]);
  let text = $state(
    "Patrick Dupont, 06 39 98 12 34, patrick@example.com, SIRET 732 829 320 00074, 75008 Paris.",
  );
  let result = $state<CompareOut | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  const slots = $derived(refs.map((_, index) => index));

  /**
   * A disputed value and the objects that caught it.
   *
   * "Caught by some" said a value was contested without saying by whom, which
   * is the one thing a comparison is for. The catchers are derived here rather
   * than asked of the API: the runs already carry every kept hit.
   */
  const disputed = $derived(
    (result?.disputed ?? []).map((value) => ({
      value,
      by: (result?.runs ?? [])
        .filter((run) => run.hits.some((hit) => hit.kept && hit.text === value))
        .map((run) => run.ref),
    })),
  );
  const colors = $derived(
    assignLabelColors(
      result?.runs.flatMap((run) => run.hits.map((hit) => hit.label)) ?? [],
    ),
  );

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

<PlaygroundShell>
  <Region
    step={1}
    done={result !== null}
    title={t("play.configure")}
    bodyClass="gap-3"
  >
    {#each slots as index (index)}
      <div class="flex items-center gap-1.5">
        <RefPicker
          id="cmp-{index}"
          bind:value={refs[index]}
          label="{t('play.object')} {index + 1}"
        />
        {#if refs.length > 2}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("compare.remove")}
            onclick={() => (refs = refs.filter((_, i) => i !== index))}
          >
            <X />
          </Button>
        {/if}
      </div>
    {/each}
    {#if refs.length < 4}
      <Button
        variant="outline"
        size="sm"
        class="self-start"
        onclick={() => (refs = [...refs, "piighost/generic"])}
      >
        <Plus />
        {t("compare.add")}
      </Button>
    {/if}
    <div class="mt-auto flex flex-col gap-2 pt-2">
      <Button onclick={go} disabled={busy || text.trim() === ""}>
        {#if busy}<Loader class="animate-spin" />{/if}
        {busy ? t("play.running") : t("compare.go")}
      </Button>
      {#if error}<p class="text-xs text-destructive">{error}</p>{/if}
      <p class="text-xs text-muted-foreground">{t("play.privacy")}</p>
    </div>
  </Region>

  <Region
    step={2}
    done={result !== null}
    title={t("play.text")}
    bodyClass="gap-4"
  >
    {#snippet action()}
      <SamplePicker
        onpick={(sample) => (text = sample.text.trim())}
        disabled={busy}
      />
    {/snippet}
    <textarea
      bind:value={text}
      spellcheck="false"
      aria-label={t("play.text")}
      class="{TEXTAREA} min-h-24"></textarea>
    {#if result}
      {#each result.runs as run (run.ref)}
        <div>
          <p class="mb-1.5 font-mono text-xs text-muted-foreground">
            {run.ref} ·
            <span class="tabular-nums"
              >{run.hits.filter((h) => h.kept).length} {t("play.kept")}</span
            >
          </p>
          <div class="rounded-lg border bg-muted/30 p-3">
            <EntityHighlight {text} hits={run.hits} {colors} />
          </div>
        </div>
      {/each}
    {/if}
  </Region>

  <Region step={3} done={result !== null} title={t("play.results")}>
    {#if !result}
      <p class="text-sm text-muted-foreground">{t("play.empty")}</p>
    {:else}
      <h3 class="{EYEBROW} mb-2">{t("compare.agreed")}</h3>
      <ul class="space-y-1.5">
        {#each result.agreed as value (value)}
          <li class="rounded-md bg-muted/40 p-2 font-mono text-sm">{value}</li>
        {:else}
          <li class="text-sm text-muted-foreground">{t("play.nothing")}</li>
        {/each}
      </ul>
      <h3 class="{EYEBROW} mt-5 mb-2">{t("compare.disputed")}</h3>
      <ul class="space-y-1.5">
        {#each disputed as entry (entry.value)}
          <li class="rounded-md bg-muted/40 p-2">
            <p class="font-mono text-sm break-all">{entry.value}</p>
            <p class="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {#each entry.by as ref (ref)}
                <a
                  href={refPath(ref)}
                  class="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {ref}
                </a>
              {/each}
            </p>
          </li>
        {:else}
          <li class="text-sm text-muted-foreground">{t("play.nothing")}</li>
        {/each}
      </ul>
    {/if}
  </Region>
</PlaygroundShell>
