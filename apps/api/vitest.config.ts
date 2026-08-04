import { defineConfig } from "vitest/config";

export default defineConfig({
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
  },
});
