import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a real API and a real registry.
 *
 * The unit tests cover the pure modules, which is where the manifest writing
 * and the reference grammar live. What they cannot see is the layer that has
 * cost the most: a count present in the DOM and painted away by an ancestor's
 * overflow, an edit that matched nothing and changed nothing, a form that
 * looked filled and submitted a manifest missing a field. Those need a browser
 * and a backend, so this starts both.
 *
 * The API serves the repository's own registry, so the assertions can name
 * `piighost/email` and mean it.
 */
const API_PORT = 8057;
const WEB_PORT = 5179;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `uv run litestar run --port ${API_PORT}`,
      cwd: "..",
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { HUB_REGISTRY_DIR: "registry", LITESTAR_APP: "backend.app:app" },
      // `uv run` and `pnpm dev` each spawn the real server as a child, and a
      // SIGTERM to the wrapper leaves it holding the port. Without this the
      // run hangs at teardown after every test has already passed.
      gracefulShutdown: { signal: "SIGTERM", timeout: 3000 },
    },
    {
      command: `pnpm dev --port ${WEB_PORT}`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_URL: `http://127.0.0.1:${API_PORT}`,
        VITE_PORT: String(WEB_PORT),
      },
      gracefulShutdown: { signal: "SIGTERM", timeout: 3000 },
    },
  ],
});
