<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import Plus from "@lucide/svelte/icons/plus";
  import Trash from "@lucide/svelte/icons/trash-2";
  import Button from "./ui/Button.svelte";
  import RefPicker from "./RefPicker.svelte";
  import { api } from "../lib/api";
  import { cn } from "../lib/cn";
  import { t } from "../lib/i18n.svelte";
  import type { GroupDraft } from "../lib/group-draft";

  /**
   * The sources of a group, in the order that decides who wins a span.
   *
   * Each row offers the labels its source actually provides, so an exclusion is
   * picked rather than typed: the registry refuses a manifest that excludes a
   * label the source does not have, and a typo there is the kind of mistake
   * that only surfaces at submission.
   */
  let { draft = $bindable() }: { draft: GroupDraft } = $props();

  /** The labels a reference resolves to, for the exclusion chips. */
  function labelsOf(ref: string) {
    const [namespace, name] = ref.split("/");
    return api
      .resolved({ namespace, name, selector: "latest" })
      .then((resolved) => (resolved.labels ?? []).map((entry) => entry.label))
      .catch(() => []);
  }

  function move(index: number, by: number) {
    const next = [...draft.sources];
    const [row] = next.splice(index, 1);
    next.splice(index + by, 0, row);
    draft.sources = next;
  }

  function toggle(source: GroupDraft["sources"][number], label: string) {
    source.exclude = source.exclude.includes(label)
      ? source.exclude.filter((entry) => entry !== label)
      : [...source.exclude, label];
  }
</script>

<div class="flex flex-col gap-3 overflow-y-auto">
  <p class="text-xs text-muted-foreground">{t("draft.sourcesNote")}</p>

  <ol class="space-y-3">
    {#each draft.sources as source, index (index)}
      <li class="rounded-lg border p-2">
        <div class="flex items-center gap-2">
          <span
            class="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground"
            >{index + 1}</span
          >
          <div class="min-w-0 flex-1">
            <RefPicker
              id="source-{index}"
              bind:value={source.ref}
              label={t("draft.source")}
            />
          </div>
          <button
            type="button"
            aria-label={t("draft.moveUp")}
            disabled={index === 0}
            class="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
            onclick={() => move(index, -1)}
          >
            <ChevronUp class="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("draft.moveDown")}
            disabled={index === draft.sources.length - 1}
            class="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
            onclick={() => move(index, 1)}
          >
            <ChevronDown class="size-4" />
          </button>
          <button
            type="button"
            aria-label={t("draft.remove")}
            class="shrink-0 text-muted-foreground hover:text-destructive"
            onclick={() =>
              (draft.sources = draft.sources.filter((_, i) => i !== index))}
          >
            <Trash class="size-4" />
          </button>
        </div>

        {#if source.ref !== ""}
          {#await labelsOf(source.ref) then labels}
            {#if labels.length > 0}
              <div class="mt-2 ps-7">
                <p class="mb-1 text-xs text-muted-foreground">
                  {t("draft.exclude")}
                </p>
                <ul class="flex flex-wrap gap-1">
                  {#each labels as label (label)}
                    <li>
                      <button
                        type="button"
                        aria-pressed={source.exclude.includes(label)}
                        class={cn(
                          "rounded-full px-2 py-0.5 font-mono text-xs transition-colors",
                          source.exclude.includes(label)
                            ? "bg-destructive/10 text-destructive line-through"
                            : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                        onclick={() => toggle(source, label)}
                      >
                        {label}
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/await}
        {/if}
      </li>
    {/each}
  </ol>

  <Button
    variant="ghost"
    size="sm"
    class="self-start"
    onclick={() =>
      (draft.sources = [...draft.sources, { ref: "", exclude: [] }])}
  >
    <Plus />
    {t("draft.addSource")}
  </Button>
</div>
