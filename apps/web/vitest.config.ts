import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Same reasoning as apps/api's config: `schemas` resolves to its built
      // dist/ for real consumers, but tests run against the TypeScript source
      // so a stale build can never mask a failure.
      schemas: fileURLToPath(new URL("../../packages/schemas/src/index.ts", import.meta.url)),
      // `@/` is the app's own path alias (tsconfig.json "paths"), and until
      // P13.S1 every tested module here happened to avoid it -- so a module
      // that imports `@/lib/...` failed to resolve under vitest with "Cannot
      // find package", which reads like a missing dependency rather than a
      // missing alias. Mirrored from tsconfig rather than invented, so the two
      // cannot disagree about what `@/` means.
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    name: "web",
    // "jsdom" + @testing-library/react land when Phase 1 starts testing real
    // components; nothing here renders the DOM yet.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
