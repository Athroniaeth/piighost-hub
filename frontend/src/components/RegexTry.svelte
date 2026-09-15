<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import X from "@lucide/svelte/icons/x";
  import { ApiError, api } from "../lib/api";
  import { t } from "../lib/i18n.svelte";

  /**
   * What the Python engine says about one example, live.
   *
   * A browser cannot answer this: piighost compiles with `re.ASCII` and Python
   * and JavaScript disagree on lookbehind, on what `\w` covers and on how a
   * quantifier backtracks. So the candidate runs where it will actually run,
   * in the same killed-on-timeout worker the playground uses.
   *
   * An effect rather than a derived, deliberately: this has to debounce, and it
   * has to abandon a request whose answer arrived after the regex changed
   * again. Neither is something a derived can express.
   */
  let {
    regex,
    text,
    expected = null,
  }: { regex: string; text: string; expected?: string | null } = $props();

  type Verdict =
    | { state: "idle" }
    | { state: "busy" }
    | { state: "ok" }
    | { state: "bad"; detail: string };

  let verdict = $state<Verdict>({ state: "idle" });

  $effect(() => {
    const pattern = regex.trim();
    const sentence = text.trim();
    const wanted = expected?.trim() ?? "";
    if (
      pattern === "" ||
      sentence === "" ||
      (expected !== null && wanted === "")
    ) {
      verdict = { state: "idle" };
      return;
    }

    let live = true;
    // Debounced: this fires on every keystroke in the regex field, and each run
    // spawns a process on the server.
    const timer = setTimeout(async () => {
      verdict = { state: "busy" };
      try {
        const run = await api.candidate(pattern, sentence, "CANDIDATE");
        if (!live) return;
        const found = run.hits.map((hit) => hit.text);
        if (expected === null) {
          verdict =
            found.length === 0
              ? { state: "ok" }
              : { state: "bad", detail: found.join(", ") };
        } else if (found.length === 1 && found[0] === wanted) {
          verdict = { state: "ok" };
        } else {
          verdict = {
            state: "bad",
            detail: found.length === 0 ? t("draft.nothing") : found.join(", "),
          };
        }
      } catch (caught) {
        if (live)
          verdict = {
            state: "bad",
            detail:
              caught instanceof ApiError ? caught.message : String(caught),
          };
      }
    }, 500);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  });
</script>

{#if verdict.state === "busy"}
  <Loader class="size-3.5 shrink-0 animate-spin text-muted-foreground" />
{:else if verdict.state === "ok"}
  <Check class="size-3.5 shrink-0 text-primary" aria-label={t("draft.ok")} />
{:else if verdict.state === "bad"}
  <span class="flex min-w-0 items-center gap-1 text-xs text-destructive">
    <X class="size-3.5 shrink-0" aria-hidden="true" />
    <span class="truncate font-mono">{verdict.detail}</span>
  </span>
{/if}
