<script lang="ts">
  import TagPicker from "./TagPicker.svelte";
  import { labelOf, type PatternDraft } from "../lib/pattern-draft";
  import { t } from "../lib/i18n.svelte";
  import { FIELD, FIELD_MONO } from "../lib/ui";

  /**
   * What a pattern is, before its examples: identity, shape, wording.
   *
   * The name is not asked for twice. A submission's name and its manifest's
   * name have to be equal or the registry refuses the file, so the field above
   * this one is the only one, and the draft follows it.
   */
  let { draft = $bindable(), name }: { draft: PatternDraft; name: string } =
    $props();

  // The label follows the name until someone types their own, which is the
  // common case (`fr-nir` gives `FR_NIR`) without taking the choice away.
  let labelTouched = $state(false);

  $effect(() => {
    draft.name = name;
    if (!labelTouched) draft.label = labelOf(name);
  });
</script>

<label class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.label")}
  <input
    bind:value={draft.label}
    oninput={() => (labelTouched = true)}
    placeholder="ORDER_ID"
    spellcheck="false"
    class={FIELD_MONO}
  />
</label>

<div class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.tags")}
  <TagPicker bind:value={draft.tags} />
</div>

<label class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.regex")}
  <input
    bind:value={draft.regex}
    placeholder={"\\bORD-[0-9]" + "{6}" + "\\b"}
    spellcheck="false"
    class={FIELD_MONO}
  />
  <span class="text-xs font-normal text-muted-foreground"
    >{t("draft.regexNote")}</span
  >
</label>

<div class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.description")}
  <input
    bind:value={draft.en}
    placeholder="Internal order identifier, six digits after an ORD- prefix."
    aria-label="{t('draft.description')} (en)"
    class={FIELD}
  />
  <input
    bind:value={draft.fr}
    placeholder="Identifiant de commande interne, six chiffres après un préfixe ORD-."
    aria-label="{t('draft.description')} (fr)"
    class={FIELD}
  />
</div>
