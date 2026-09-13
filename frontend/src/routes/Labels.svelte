<script lang="ts">
  import Async from "../components/Async.svelte";
  import { api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";
  import { refPath } from "../lib/router.svelte";

  const labels = $derived(api.labels());
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="text-2xl font-semibold tracking-tight">{t("labels.title")}</h1>
  <p class="muted mt-2 max-w-2xl text-sm">{t("labels.lede")}</p>

  <Async promise={labels}>
    {#snippet children(result)}
      <ul class="mt-6 grid gap-2 sm:grid-cols-2">
        {#each result.items as entry (entry.label)}
          <li
            class="surface flex flex-wrap items-baseline gap-x-2 rounded-lg px-3 py-2"
          >
            <code class="font-mono text-sm">{entry.label}</code>
            <span class="muted text-xs">{t("labels.definedBy")}</span>
            {#each entry.patterns as key (key)}
              <a href={refPath(key)} class="text-xs underline">{key}</a>
            {/each}
          </li>
        {/each}
      </ul>
    {/snippet}
  </Async>
</div>
