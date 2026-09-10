import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `schemas`' package entry points at its built `dist/` so plain Node can
      // load it in production (`node dist/server.js`). Tests deliberately
      // resolve the TypeScript source instead: the suite must fail on the code
      // as written, not on a stale artifact from an earlier build, and
      // `pnpm test` on a fresh clone has no dist/ at all.
      schemas: fileURLToPath(new URL("../../packages/schemas/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Test runs have no pretty transport, so every logged line lands in the
    // reporter output as raw JSON. The suite deliberately exercises invalid
    // input and error paths -- which the error middleware now logs -- so
    // without this the real assertion failures get buried. Override on the
    // command line (`LOG_LEVEL=debug pnpm test`) when debugging a test.
    env: { LOG_LEVEL: "silent" },
    // Creates and migrates the *test* database before anything connects. It is
    // a different database from the one `pnpm dev` uses -- see
    // config/prisma.ts's resolveDatabaseUrl for the incident that made that
    // separation necessary again.
    globalSetup: ["./src/config/testDbSetup.ts"],
    // The integration suites share one migrated PostgreSQL database and
    // truncate between files (see src/config/testDb.ts). Two files running at
    // once would therefore see each other's rows -- and worse, one would
    // truncate the other's fixtures mid-assertion. Under Mongo each file had
    // its own throwaway database and parallelism was free; here it is not.
    fileParallelism: false,
  },
});
