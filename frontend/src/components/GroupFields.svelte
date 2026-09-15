<script lang="ts">
  import TagPicker from "./TagPicker.svelte";
  import { GROUP_PLACEHOLDER, type GroupDraft } from "../lib/group-draft";
  import { t } from "../lib/i18n.svelte";
  import { FIELD } from "../lib/ui";

  /** What a group is, beside its sources: who it serves, said in two languages. */
  let { draft = $bindable(), name }: { draft: GroupDraft; name: string } =
    $props();

  $effect(() => {
    draft.name = name;
  });
</script>

<div class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.tags")}
  <TagPicker bind:value={draft.tags} />
</div>

<div class="flex flex-col gap-1 text-sm font-medium">
  {t("draft.description")}
  <input
    bind:value={draft.en}
    placeholder={GROUP_PLACEHOLDER.en}
    aria-label="{t('draft.description')} (en)"
    class={FIELD}
  />
  <input
    bind:value={draft.fr}
    placeholder={GROUP_PLACEHOLDER.fr}
    aria-label="{t('draft.description')} (fr)"
    class={FIELD}
  />
</div>
