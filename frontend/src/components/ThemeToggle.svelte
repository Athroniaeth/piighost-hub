<script lang="ts">
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import Button from "./ui/Button.svelte";
  import { t } from "../lib/i18n.svelte";
  import { theme } from "../lib/theme.svelte";
</script>

<Button
  variant="ghost"
  size="icon"
  aria-label={t("nav.theme")}
  aria-pressed={theme.dark}
  onclick={() => theme.toggle()}
>
  <!-- The icon of the mode a click gives, as piighost.dev: a sun in dark mode. -->
  {#if theme.dark}<Sun class="size-5" />{:else}<Moon class="size-5" />{/if}
</Button>
