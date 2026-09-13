<script lang="ts">
  import { t } from "../lib/i18n.svelte";

  let { kind }: { kind: string } = $props();

  const label = $derived(
    kind === "pattern"
      ? t("common.pattern")
      : kind === "group"
        ? t("common.group")
        : t("common.config"),
  );
</script>

<span
  class="hairline rounded border px-1.5 py-0.5 text-[0.7rem] uppercase tracking-wide muted"
>
  {label}
</span>
