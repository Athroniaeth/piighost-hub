<script lang="ts">
  import SiteFooter from "./components/SiteFooter.svelte";
  import SiteNav from "./components/SiteNav.svelte";
  import Chat from "./routes/Chat.svelte";
  import Compare from "./routes/Compare.svelte";
  import Contribute from "./routes/Contribute.svelte";
  import Detail from "./routes/Detail.svelte";
  import Home from "./routes/Home.svelte";
  import Labels from "./routes/Labels.svelte";
  import NotFound from "./routes/NotFound.svelte";
  import Playground from "./routes/Playground.svelte";
  import { i18n, t } from "./lib/i18n.svelte";
  import { interceptLinks, router } from "./lib/router.svelte";

  const route = $derived(router.route);

  // The document language follows the switcher: a screen reader picks its voice
  // from it, and it is the one piece of the page Svelte does not own.
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });
</script>

<svelte:body onclick={interceptLinks} />

<a class="skip-link" href="#content">{t("nav.skip")}</a>

<div class="flex min-h-dvh flex-col">
  <SiteNav />
  <main id="content" class="flex-1">
    {#if route.name === "home"}
      <Home />
    {:else if route.name === "labels"}
      <Labels />
    {:else if route.name === "playground"}
      <Playground />
    {:else if route.name === "compare"}
      <Compare />
    {:else if route.name === "chat"}
      <Chat />
    {:else if route.name === "contribute"}
      <Contribute />
    {:else if route.name === "detail"}
      {#key router.path}
        <Detail
          namespace={route.params.namespace}
          name={route.params.name}
          selector={route.params.selector ?? "latest"}
        />
      {/key}
    {:else}
      <NotFound />
    {/if}
  </main>
  <SiteFooter />
</div>
