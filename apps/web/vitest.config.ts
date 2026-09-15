import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Same reasoning as apps/api's config: `schemas` resolves to its built
      // dist/ for real consumers, but tests run against the TypeScript source
      // so a stale build can never mask a failure.
      //
      // The subpath entries below MUST be listed before the bare `schemas`
      // entry (P15.S8). Vite's alias matcher (`@rollup/plugin-alias`
      // semantics) treats a string `find` as a *prefix* match --
      // `importee === find || importee.startsWith(find + "/")` -- and takes
      // the first entry in insertion order that matches. With only the bare
      // `schemas` entry present, `schemas/catalog-systems` also satisfies
      // that prefix test, and the matched entry's `replacement` (an absolute
      // path ENDING IN `index.ts`, a file) gets `/catalog-systems` appended
      // to it -- `.../schemas/src/index.ts/catalog-systems`, which resolves
      // nowhere. Ordering the specific subpaths first means they hit an exact
      // match (`importee === find`) before the generic entry ever gets a
      // chance to swallow them. This was a real, previously-unexercised bug:
      // `schemas/fa-text` (already shipped, used by Pagination.tsx and
      // PriceTag.tsx) failed identically under vitest, just with no test
      // that imported it to notice.
      "schemas/fa-text": fileURLToPath(
        new URL("../../packages/schemas/src/faText.ts", import.meta.url),
      ),
      "schemas/fa": fileURLToPath(new URL("../../packages/schemas/src/fa.ts", import.meta.url)),
      "schemas/catalog-systems": fileURLToPath(
        new URL("../../packages/schemas/src/catalogSystems.ts", import.meta.url),
      ),
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
