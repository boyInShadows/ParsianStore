import { defineConfig } from "@playwright/test";

/**
 * The port the web app is served on for a test run.
 *
 * Configurable because `reuseExistingServer` trusts whatever answers on this
 * port, and it does not check that the answer is *this* app. On a machine
 * where another project already holds 3000, `next dev` quietly moves to 3001
 * while the health check below passes against the neighbour -- so the suite
 * runs green or red against a site nobody in this repo wrote. Passing the port
 * to `next dev` as well as to the URL is what keeps the two from disagreeing.
 */
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  webServer: [
    {
      command: "pnpm --filter api dev",
      // One suite run is ~25 landing renders in under a minute, each fanning
      // out to several endpoints -- well past the 100/min/IP API cap. A
      // throttled response degrades a Server Component to an empty section,
      // so the page looks broken and tests fail for reasons that have nothing
      // to do with the code. See apps/api/src/config/env.ts.
      env: { RATE_LIMIT_DISABLED: "true" },
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // `exec next dev`, not `run dev -- -p`: pnpm forwards the `--`
      // itself and next reads the bare `-p` that follows as a project
      // directory ("no such directory: apps/web/-p").
      command: `pnpm --filter web exec next dev -p ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  use: {
    baseURL,
  },
});
