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
  // next.config's tsconfig sets `jsx: "preserve"` -- Next does its own JSX
  // transform -- so vite hands its transformer a .tsx file it refuses to parse. P14.S7
  // needed to render a component to a string (the marquee's two runs have to
  // be *structurally* identical, which no test of a stylesheet or a pure
  // function can show), so the transform is named here instead. It affects the
  // test runner only; nothing about the app build reads this file. (`oxc`, not
  // `esbuild`: vite 8 transforms with oxc and ignores the esbuild block.)
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    name: "web",
    // Still "node", and still no jsdom: `renderToStaticMarkup` needs no DOM,
    // and the component assertions here are about the markup a server render
    // emits, not about behaviour after hydration.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
