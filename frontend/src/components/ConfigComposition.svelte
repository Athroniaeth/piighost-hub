<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import Trash from "@lucide/svelte/icons/trash-2";
  import Button from "./ui/Button.svelte";
  import RefPicker from "./RefPicker.svelte";
  import { api } from "../lib/api";
  import { cn } from "../lib/cn";
  import {
    CONFIG_PLACEHOLDER,
    STAGES,
    type ConfigDraft,
  } from "../lib/config-draft";
  import { t, type Key } from "../lib/i18n.svelte";
  import { EYEBROW, FIELD, FIELD_MONO } from "../lib/ui";

  /**
   * What a configuration composes: what it inherits, what it declares, and the
   * three stages that turn a set of labels into a pipeline.
   *
   * Exclusions are picked rather than typed, from what the parent actually
   * resolves to. The registry refuses a manifest excluding something a parent
   * does not have, and a typo there only surfaces at submission.
   */
  let { draft = $bindable() }: { draft: ConfigDraft } = $props();

  /** What a parent offers to exclude: its detectors, then its labels. */
  function targetsOf(ref: string) {
    const [namespace, name] = ref.split("/");
    return api
      .resolved({ namespace, name, selector: "latest" })
      .then((resolved) => [
        ...(resolved.detectors ?? []).map((one) => `detector:${one.name}`),
        ...(resolved.labels ?? []).map((one) => `label:${one.label}`),
      ])
      .catch(() => [] as string[]);
  }

  function toggle(parent: ConfigDraft["extends"][number], target: string) {
    parent.exclude = parent.exclude.includes(target)
      ? parent.exclude.filter((entry) => entry !== target)
      : [...parent.exclude, target];
  }
</script>

<div class="flex flex-col gap-4 overflow-y-auto">
  <section>
    <h3 class="{EYEBROW} mb-2">{t("draft.extends")}</h3>
    <ul class="space-y-3">
      {#each draft.extends as parent, index (index)}
        <li class="rounded-lg bg-muted/40 p-2">
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <RefPicker
                id="extend-{index}"
                bind:value={parent.ref}
                kind="config"
                label={t("draft.extends")}
              />
            </div>
            <button
              type="button"
              aria-label={t("draft.remove")}
              class="shrink-0 text-muted-foreground hover:text-destructive"
              onclick={() =>
                (draft.extends = draft.extends.filter((_, i) => i !== index))}
            >
              <Trash class="size-4" />
            </button>
          </div>
          {#if parent.ref}
            {#await targetsOf(parent.ref) then targets}
              {#if targets.length > 0}
                <p class="mt-2 mb-1 text-xs text-muted-foreground">
                  {t("draft.exclude")}
                </p>
                <ul class="flex flex-wrap gap-1">
                  {#each targets as target (target)}
                    <li>
                      <button
                        type="button"
                        aria-pressed={parent.exclude.includes(target)}
                        class={cn(
                          "rounded-full px-2 py-0.5 font-mono text-xs",
                          parent.exclude.includes(target)
                            ? "bg-destructive/15 text-destructive line-through"
                            : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                        onclick={() => toggle(parent, target)}
                      >
                        {target}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            {/await}
          {/if}
        </li>
      {/each}
    </ul>
    <Button
      variant="ghost"
      size="sm"
      class="mt-1"
      onclick={() =>
        (draft.extends = [...draft.extends, { ref: "", exclude: [] }])}
    >
      <Plus />
      {t("draft.add")}
    </Button>
  </section>

  <section>
    <h3 class="{EYEBROW} mb-2">{t("draft.detectors")}</h3>
    <p class="mb-2 text-xs text-muted-foreground">{t("draft.detectorsNote")}</p>
    <ul class="space-y-3">
      {#each draft.detectors as detector, index (index)}
        <li class="rounded-lg bg-muted/40 p-2">
          <div class="flex items-center gap-2">
            <input
              bind:value={detector.name}
              placeholder={CONFIG_PLACEHOLDER.detector}
              aria-label={t("draft.detectorName")}
              spellcheck="false"
              class="{FIELD_MONO} flex-1"
            />
            <button
              type="button"
              aria-label={t("draft.remove")}
              class="shrink-0 text-muted-foreground hover:text-destructive"
              onclick={() =>
                (draft.detectors = draft.detectors.filter(
                  (_, i) => i !== index,
                ))}
            >
              <Trash class="size-4" />
            </button>
          </div>
          <ul class="mt-2 space-y-1.5">
            {#each detector.groups as group, slot (slot)}
              <li class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <RefPicker
                    id="detector-{index}-{slot}"
                    bind:value={detector.groups[slot]}
                    kind="group"
                    label="{t('draft.groups')} {group}"
                  />
                </div>
                <button
                  type="button"
                  aria-label={t("draft.remove")}
                  class="shrink-0 text-muted-foreground hover:text-destructive"
                  onclick={() =>
                    (detector.groups = detector.groups.filter(
                      (_, i) => i !== slot,
                    ))}
                >
                  <Trash class="size-4" />
                </button>
              </li>
            {/each}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            class="mt-1"
            onclick={() =>
              (detector.groups = [...detector.groups, "piighost/generic"])}
          >
            <Plus />
            {t("draft.addGroup")}
          </Button>
        </li>
      {/each}
    </ul>
    <Button
      variant="ghost"
      size="sm"
      class="mt-1"
      onclick={() =>
        (draft.detectors = [...draft.detectors, { name: "", groups: [] }])}
    >
      <Plus />
      {t("draft.add")}
    </Button>
  </section>

  <section>
    <h3 class="{EYEBROW} mb-2">{t("draft.stages")}</h3>
    <div class="grid gap-2 sm:grid-cols-3">
      {#each Object.entries(STAGES) as [section, options] (section)}
        <label class="flex flex-col gap-1 text-xs font-medium">
          {t(`draft.stage.${section}` as Key)}
          <select
            bind:value={draft.stages[section as keyof typeof STAGES]}
            class={FIELD}
          >
            {#each options as option (option)}
              <option value={option}>{option || t("detail.none")}</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>
    <p class="mt-1 text-xs text-muted-foreground">{t("draft.stagesNote")}</p>
  </section>
</div>
