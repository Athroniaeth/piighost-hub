<script lang="ts">
  import TagPicker from "./TagPicker.svelte";
  import { CONFIG_PLACEHOLDER, type ConfigDraft } from "../lib/config-draft";
  import { t } from "../lib/i18n.svelte";
  import { FIELD, FIELD_MONO } from "../lib/ui";

  /** What a configuration is, before what it composes. */
  let { draft = $bindable(), name }: { draft: ConfigDraft; name: string } =
    $props();

  $effect(() => {
    draft.name = name;
  });
</script>

<label class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.piighost")}
  <input
    bind:value={draft.piighost}
    placeholder={CONFIG_PLACEHOLDER.piighost}
    spellcheck="false"
    class={FIELD_MONO}
  />
  <span class="text-xs font-normal text-muted-foreground"
    >{t("draft.piighostNote")}</span
  >
</label>

<div class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.tags")}
  <TagPicker bind:value={draft.tags} />
</div>

<div class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.description")}
  <input
    bind:value={draft.en}
    placeholder={CONFIG_PLACEHOLDER.en}
    aria-label="{t('draft.description')} (en)"
    class={FIELD}
  />
  <input
    bind:value={draft.fr}
    placeholder={CONFIG_PLACEHOLDER.fr}
    aria-label="{t('draft.description')} (fr)"
    class={FIELD}
  />
</div>
