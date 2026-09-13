<script lang="ts">
  import Nav from "./components/Nav.svelte";
  import Browse from "./routes/Browse.svelte";
  import Chat from "./routes/Chat.svelte";
  import Compare from "./routes/Compare.svelte";
  import Detail from "./routes/Detail.svelte";
  import Home from "./routes/Home.svelte";
  import Labels from "./routes/Labels.svelte";
  import NotFound from "./routes/NotFound.svelte";
  import Playground from "./routes/Playground.svelte";
  import Submit from "./routes/Submit.svelte";
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
<Nav />

<main id="content">
  {#if route.name === "home"}
    <Home />
  {:else if route.name === "browse"}
    <Browse />
  {:else if route.name === "labels"}
    <Labels />
  {:else if route.name === "playground"}
    <Playground />
  {:else if route.name === "compare"}
    <Compare />
  {:else if route.name === "chat"}
    <Chat />
  {:else if route.name === "submit"}
    <Submit />
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

<footer class="hairline mt-16 border-t">
  <div
    class="muted mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-1 px-4 py-6 text-sm"
  >
    <a class="underline" href="https://github.com/Athroniaeth/piighost"
      >piighost</a
    >
    <a class="underline" href="https://athroniaeth.github.io/piighost/"
      >documentation</a
    >
    <a class="underline" href="https://discord.gg/vFg9GHQR2s">Discord</a>
    <span class="ms-auto">MIT</span>
  </div>
</footer>
