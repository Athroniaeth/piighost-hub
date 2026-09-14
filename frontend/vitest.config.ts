import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/**
 * A config of its own rather than a `test` block in vite.config.ts.
 *
 * The Vite config loads the Litestar plugin, which wants an APP_URL and tries
 * to configure a dev server. A test run needs neither, and borrowing that
 * config means every `vitest` invocation carries an environment check that has
 * nothing to do with the test.
 */
export default defineConfig({
  plugins: [svelte()],
  resolve: { conditions: ["browser"] },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
  },
});
