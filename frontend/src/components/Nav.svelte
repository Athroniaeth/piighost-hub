<script lang="ts">
  import { i18n, t } from "../lib/i18n.svelte";
  import { router } from "../lib/router.svelte";

  const links = [
    { href: "/browse", key: "nav.browse" as const },
    { href: "/labels", key: "nav.labels" as const },
    { href: "/playground", key: "nav.playground" as const },
    { href: "/compare", key: "nav.compare" as const },
    { href: "/chat", key: "nav.chat" as const },
    { href: "/submit", key: "nav.submit" as const },
  ];

  const current = $derived(router.path);
</script>

<header
  class="hairline sticky top-0 z-20 border-b bg-[var(--page)]/95 backdrop-blur"
>
  <nav
    aria-label="Main"
    class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
  >
    <a href="/" class="font-semibold tracking-tight">
      piighost <span class="accent">hub</span>
    </a>
    <ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {#each links as link (link.href)}
        <li>
          <a
            href={link.href}
            class="hover:underline"
            class:accent={current.startsWith(link.href)}
            aria-current={current.startsWith(link.href) ? "page" : undefined}
          >
            {t(link.key)}
          </a>
        </li>
      {/each}
    </ul>
    <div class="ms-auto flex items-center gap-1 text-sm">
      {#each ["en", "fr"] as const as code (code)}
        <button
          type="button"
          class="rounded px-2 py-1 uppercase hover:underline"
          class:accent={i18n.locale === code}
          aria-pressed={i18n.locale === code}
          onclick={() => i18n.set(code)}
        >
          {code}
        </button>
      {/each}
    </div>
  </nav>
</header>
