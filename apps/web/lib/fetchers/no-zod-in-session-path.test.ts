import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * P15.S8b's whole point: `AuthSession`/`CartSession` mount on every shop
 * route, and importing a single zod-defining binding anywhere in their
 * import graph pulls the entire ~14 kB zod runtime back in (P15.S8's own
 * lesson -- a partial conversion measures exactly zero). This file is the
 * regression guard for that: it greps the modules P15.S8b converted for
 * the specific patterns that would reintroduce zod, so a future edit that
 * "just needs one more schema" fails here instead of silently rotting the
 * budget the way the 180 KB line did before `check:budget` existed.
 *
 * Same technique as `lib/cx.test.ts`'s tailwind-merge budget guard.
 */
const CONVERTED_FILES = [
  "fetchers/auth.ts",
  "fetchers/cart.ts",
  "fetchers/wishlist.ts",
  "fetchers/product-guard.ts",
  "shape-guard.ts",
] as const;

describe("the session path's zod budget", () => {
  it.each(CONVERTED_FILES)(
    "%s does not import zod, directly or via a schema module",
    async (rel) => {
      // this test file lives in lib/fetchers/, so its own parent (lib/) is
      // the root every CONVERTED_FILES entry is relative to.
      const root = path.resolve(import.meta.dirname, "..");
      const source = await readFile(path.join(root, rel), "utf8");

      expect(/from\s+["']zod["']/.test(source), `${rel} imports zod directly`).toBe(false);

      // A *runtime* (non type-only) import from the "schemas" barrel or any
      // subpath other than the confirmed zod-free "schemas/catalog-systems"
      // (see product-guard.ts's own comment) risks pulling a zod-defining
      // module back in. `import type { ... } from "schemas"` is fine -- it's
      // erased at build time -- so this only flags a *value* import.
      const importLines = source.match(/^import\s+.*from\s+["']schemas(\/[^"']*)?["'];?$/gm) ?? [];
      const unsafeValueImports = importLines.filter((line) => {
        if (/^import\s+type\s/.test(line)) return false;
        if (/from\s+["']schemas\/catalog-systems["']/.test(line)) return false;
        return true;
      });

      expect(
        unsafeValueImports,
        `${rel} has a runtime import from a zod-bearing "schemas" module:\n  ${unsafeValueImports.join("\n  ")}`,
      ).toEqual([]);
    },
  );
});
