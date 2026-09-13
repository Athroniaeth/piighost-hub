<script lang="ts">
  import { t } from "../lib/i18n.svelte";
</script>

<div class="mx-auto max-w-3xl px-4 py-20 text-center">
  <h1 class="text-2xl font-semibold">{t("common.notFound")}</h1>
  <p class="muted mt-3">{t("common.notFoundLede")}</p>
  <p class="mt-6">
    <a href="/browse" class="accent underline">{t("home.browseAll")}</a>
  </p>
</div>
