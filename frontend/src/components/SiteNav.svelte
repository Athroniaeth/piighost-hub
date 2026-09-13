<script lang="ts">
  import Button from "./ui/Button.svelte";
  import GithubIcon from "./GithubIcon.svelte";
  import LangToggle from "./LangToggle.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { cn } from "../lib/cn";
  import { t } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";

  const links = [
    { href: "/", key: "nav.catalogue" as const, exact: true },
    { href: "/playground", key: "nav.playground" as const, exact: false },
    { href: "/contribute", key: "nav.contribute" as const, exact: false },
  ];

  const path = $derived(router.path);

  function active(href: string, exact: boolean) {
    return exact ? path === href : path.startsWith(href);
  }
</script>

<header
  class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur"
>
  <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
    <a
      href="/"
      class="inline-flex items-baseline gap-1.5 font-mono text-lg font-bold tracking-tight"
    >
      <span>piighost</span><span class="text-primary">hub</span>
    </a>
    <nav aria-label="Main" class="hidden items-center gap-1 md:flex">
      {#each links as link (link.href)}
        <Button
          variant="ghost"
          size="lg"
          href={link.href}
          class={cn(active(link.href, link.exact) && "text-primary")}
          aria-current={active(link.href, link.exact) ? "page" : undefined}
        >
          {t(link.key)}
        </Button>
      {/each}
    </nav>
    <div class="flex items-center gap-1">
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
      <LangToggle />
    </div>
  </div>
  <nav aria-label="Main" class="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
    {#each links as link (link.href)}
      <Button
        variant="ghost"
        size="sm"
        href={link.href}
        class={cn(active(link.href, link.exact) && "text-primary")}
      >
        {t(link.key)}
      </Button>
    {/each}
  </nav>
</header>
