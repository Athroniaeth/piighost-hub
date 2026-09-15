<script lang="ts">
  import Plus from "@lucide/svelte/icons/plus";
  import Trash from "@lucide/svelte/icons/trash-2";
  import Button from "./ui/Button.svelte";
  import RegexTry from "./RegexTry.svelte";
  import { PLACEHOLDER, type PatternDraft } from "../lib/pattern-draft";
  import { t } from "../lib/i18n.svelte";
  import { EYEBROW, FIELD, FIELD_MONO } from "../lib/ui";

  /**
   * The examples, each answered live by the engine that will run the regex.
   *
   * These are not decoration. The registry rejects a pattern whose examples do
   * not hold, and they are what the composition check replays once the pattern
   * sits beside its neighbours. Showing the verdict as you type is the whole
   * difference between writing a regex here and writing one in a text editor.
   */
  let { draft = $bindable() }: { draft: PatternDraft } = $props();

  /** The suggestion for row `index`, beyond which the generic wording stands. */
  function hint(
    rows: readonly { text: string }[],
    index: number,
    field: "text" | "value",
  ) {
    const row = rows[index] as { text: string; value?: string } | undefined;
    if (!row)
      return t(field === "text" ? "draft.matchText" : "draft.matchValue");
    return field === "text" ? row.text : (row.value ?? "");
  }
</script>

<div class="flex flex-col gap-4 overflow-y-auto">
  <section>
    <h3 class="{EYEBROW} mb-2">{t("draft.matches")}</h3>
    <ul class="space-y-2">
      {#each draft.matches as example, index (index)}
        <li class="flex items-center gap-2">
          <input
            bind:value={example.text}
            placeholder={hint(PLACEHOLDER.matches, index, "text")}
            aria-label={t("draft.matchText")}
            class="{FIELD} flex-[2]"
          />
          <input
            bind:value={example.value}
            placeholder={hint(PLACEHOLDER.matches, index, "value")}
            aria-label={t("draft.matchValue")}
            spellcheck="false"
            class="{FIELD_MONO} flex-1"
          />
          <span class="flex w-28 shrink-0 items-center justify-end">
            <RegexTry
              regex={draft.regex}
              text={example.text}
              expected={example.value}
            />
          </span>
          <button
            type="button"
            aria-label={t("draft.remove")}
            class="shrink-0 text-muted-foreground hover:text-destructive"
            onclick={() =>
              (draft.matches = draft.matches.filter((_, i) => i !== index))}
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
        (draft.matches = [...draft.matches, { text: "", value: "" }])}
    >
      <Plus />
      {t("draft.add")}
    </Button>
  </section>

  <section>
    <h3 class="{EYEBROW} mb-2">{t("draft.noMatches")}</h3>
    <ul class="space-y-2">
      {#each draft.noMatches as row, index (index)}
        <li class="flex items-center gap-2">
          <input
            bind:value={row.text}
            placeholder={hint(PLACEHOLDER.noMatches, index, "text")}
            aria-label={t("draft.matchText")}
            class="{FIELD} flex-1"
          />
          <span class="flex w-28 shrink-0 items-center justify-end">
            <RegexTry regex={draft.regex} text={row.text} expected={null} />
          </span>
          <button
            type="button"
            aria-label={t("draft.remove")}
            class="shrink-0 text-muted-foreground hover:text-destructive"
            onclick={() =>
              (draft.noMatches = draft.noMatches.filter((_, i) => i !== index))}
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
      onclick={() => (draft.noMatches = [...draft.noMatches, { text: "" }])}
    >
      <Plus />
      {t("draft.add")}
    </Button>
  </section>

  <section>
    <h3 class="{EYEBROW} mb-2">{t("draft.redos")}</h3>
    <div class="grid grid-cols-3 gap-2">
      <input
        bind:value={draft.redos.prefix}
        placeholder={PLACEHOLDER.redos.prefix}
        aria-label={t("draft.prefix")}
        spellcheck="false"
        class={FIELD_MONO}
      />
      <input
        bind:value={draft.redos.filler}
        placeholder={PLACEHOLDER.redos.filler}
        aria-label={t("draft.filler")}
        spellcheck="false"
        class={FIELD_MONO}
      />
      <input
        bind:value={draft.redos.suffix}
        placeholder={PLACEHOLDER.redos.suffix}
        aria-label={t("draft.suffix")}
        spellcheck="false"
        class={FIELD_MONO}
      />
    </div>
    <p class="mt-1 text-xs text-muted-foreground">{t("draft.redosNote")}</p>
  </section>
</div>
