import { defineConfig } from "@playwright/test";

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
      command: "pnpm --filter web dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
  },
});
