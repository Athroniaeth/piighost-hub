<script lang="ts">
  import MenuIcon from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import Breadcrumb from "./Breadcrumb.svelte";
  import Button from "./ui/Button.svelte";
  import GithubIcon from "./GithubIcon.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { t } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";

  /**
   * A slim trail bar rather than a marketing navbar, as the LangSmith Hub does:
   * the page's place in the registry on the left, the two actions a visitor
   * takes on the right. Detail pages hand their own trail through the router.
   *
   * Sized like piighost.dev's bar (h-16, px-6, 14px links, the wordmark at
   * 1.6rem) so moving between the two sites does not jump. Below 1024px the
   * links go into a `details` menu, as on the site: the browser gives keyboard
   * opening, Escape and the no-script fallback for free.
   */
  let menu = $state<HTMLDetailsElement>();
  // A client-side navigation keeps the page, so it would keep the menu open.
  $effect(() => {
    void router.route;
    if (menu) menu.open = false;
  });

  const LINK =
    "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors " +
    "hover:bg-muted hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  // 44px rows: the tap target the charter asks for in a phone menu.
  const MOBILE_LINK =
    "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors " +
    "hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  const route = $derived(router.route);
  const items = $derived.by(() => {
    const p = route.params;
    switch (route.name) {
      case "detail":
        return [
          {
            label: p.namespace,
            href: `/?q=${encodeURIComponent(p.namespace)}`,
          },
          { label: p.name },
        ];
      case "playground":
        return [{ label: t("nav.playground") }];
      case "compare":
        return [
          { label: t("nav.playground"), href: "/playground" },
          { label: t("play.compare") },
        ];
      case "chat":
        return [
          { label: t("nav.playground"), href: "/playground" },
          { label: t("play.chat") },
        ];
      case "contribute":
        return [{ label: t("nav.contribute") }];
      case "labels":
        return [{ label: t("labels.title") }];
      case "stats":
        return [{ label: t("stats.title") }];
      default:
        return [];
    }
  });
</script>

<header
  class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur"
>
  <div
    class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6"
  >
    <Breadcrumb {items} />
    <div class="flex shrink-0 items-center gap-1">
      <!-- A wrapper carries the breakpoint: Button always sets inline-flex, and
           cn() does not merge, so `hidden` on the button itself lost to it. -->
      <nav aria-label={t("nav.main")} class="hidden items-center gap-1 lg:flex">
        <a href="https://piighost.dev" class={LINK}>piighost.dev</a>
        <a href="/playground" class={LINK}>{t("nav.playground")}</a>
        <Button variant="outline" href="/contribute" class="mx-1"
          >{t("nav.contribute")}</Button
        >
      </nav>
      <Button
        variant="ghost"
        size="icon"
        href="https://github.com/Athroniaeth/piighost"
        target="_blank"
        rel="noreferrer"
        aria-label={t("nav.github")}
      >
        <GithubIcon class="size-5" />
      </Button>
      <ThemeToggle />
      <details class="group lg:hidden" bind:this={menu}>
        <summary
          class="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-lg transition-colors hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={t("nav.menu")}
        >
          <MenuIcon class="size-5 group-open:hidden" />
          <X class="hidden size-5 group-open:block" />
        </summary>
        <nav
          aria-label={t("nav.main")}
          class="absolute inset-x-0 top-16 border-b bg-background px-4 pt-2 pb-5"
        >
          <ul class="grid gap-0.5">
            <li>
              <a href="/playground" class={MOBILE_LINK}>{t("nav.playground")}</a
              >
            </li>
            <li>
              <a href="/contribute" class={MOBILE_LINK}>{t("nav.contribute")}</a
              >
            </li>
            <li>
              <a href="https://piighost.dev" class={MOBILE_LINK}>piighost.dev</a
              >
            </li>
          </ul>
        </nav>
      </details>
    </div>
  </div>
</header>
