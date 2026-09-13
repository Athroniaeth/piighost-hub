<script lang="ts">
  import Async from "../components/Async.svelte";
  import Code from "../components/Code.svelte";
  import ObjectCard from "../components/ObjectCard.svelte";
  import { api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";

  let query = $state("");

  const configs = $derived(api.search({ kind: "config" }));

  function submit(event: SubmitEvent) {
    event.preventDefault();
    router.go(`/browse?q=${encodeURIComponent(query)}`);
  }
</script>

<section class="mx-auto max-w-3xl px-4 py-12 text-center">
  <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
    {t("home.tagline")}
  </h1>
  <p class="muted mx-auto mt-4 max-w-2xl text-balance">{t("home.lede")}</p>

  <form class="mt-8 flex gap-2" onsubmit={submit} role="search">
    <input
      type="search"
      bind:value={query}
      placeholder={t("home.search")}
      aria-label={t("home.search")}
      class="hairline w-full rounded-md border bg-[var(--page)] px-4 py-2.5"
    />
    <a
      href="/browse"
      class="hairline shrink-0 rounded-md border px-4 py-2.5 text-sm whitespace-nowrap"
    >
      {t("home.browseAll")}
    </a>
  </form>
</section>

<section class="mx-auto max-w-3xl px-4 pb-10">
  <h2 class="text-sm font-semibold">{t("home.howTitle")}</h2>
  <div class="mt-3">
    <Code
      language="toml"
      code={`[detector]
type = "regex"
# A tag moves when the maintainers move it. A commit never does.
catalogs = ["hub:piighost/fr-extended:prod"]`}
    />
  </div>
  <p class="muted mt-3 text-sm">
    <a class="accent underline" href="/playground">{t("home.tryIt")}</a>
  </p>
</section>

<section class="mx-auto max-w-6xl px-4 pb-16">
  <h2 class="mb-4 text-sm font-semibold">{t("home.configs")}</h2>
  <Async promise={configs}>
    {#snippet children(result)}
      <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each result.items as item (item.key)}
          <ObjectCard {item} />
        {/each}
      </ul>
    {/snippet}
  </Async>
</section>
