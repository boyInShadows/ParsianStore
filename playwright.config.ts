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
      // A PRODUCTION build, not `next dev`, and the reason is a real bug rather
      // than a preference.
      //
      // `next dev` rewrites `.next/prerender-manifest.json` as it discovers
      // routes, and it does not do so atomically. Compile several routes at
      // once -- which is exactly what Next's own link prefetching does when a
      // long page scrolls, and the landing page is ~10,500px tall since P12.S6
      // -- and a shorter write lands on top of a longer one without truncating
      // it. The file is then valid JSON followed by the tail of the previous
      // copy, every render throws `SyntaxError: Unexpected non-whitespace
      // character after JSON at position 741`, and **it never recovers**: every
      // route 500s for the rest of the run. It cost a whole debugging session
      // once, presenting as "the last nine tests fail on data-theme", which
      // looks like a theming bug and is actually a corrupt manifest.
      //
      // A built server writes that manifest once, before any test runs. It also
      // means the suite asserts against the code that ships rather than against
      // a dev bundle. The build is the price -- about 35s, once per run.
      //
      // `exec next <cmd>`, not `run <script> -- -p`: pnpm forwards the `--`
      // itself and next reads the bare `-p` that follows as a project
      // directory ("no such directory: apps/web/-p").
      command: `pnpm --filter web exec next build && pnpm --filter web exec next start -p ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
  use: {
    baseURL,
  },
});
