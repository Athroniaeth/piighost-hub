/* Sets .dark before first paint: the page arrives prerendered, and a class set
 * by the app bundle would come after the first frame, a flash of the light
 * theme on every visit. A separate file rather than an inline script: the
 * production CSP is `script-src 'self'` with no `unsafe-inline`. Deliberately
 * neither a module nor deferred: it has to run before the page is painted. */
(function () {
  try {
    if (localStorage.getItem("piighost-hub-theme") !== "light") {
      document.documentElement.classList.add("dark");
    }
  } catch (_) {
    /* storage refused, strict private browsing: dark, the default. */
    document.documentElement.classList.add("dark");
  }
})();
