<script lang="ts">
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
   */
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
    class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4"
  >
    <Breadcrumb {items} />
    <div class="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        href="/playground"
        class="hidden sm:inline-flex">{t("nav.playground")}</Button
      >
      <Button
        variant="outline"
        size="sm"
        href="/contribute"
        class="hidden sm:inline-flex">{t("nav.contribute")}</Button
      >
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
    </div>
  </div>
</header>
