import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(import.meta.dirname, "..", "..");
const SHOP_ROOT = path.join(WEB_ROOT, "app", "[locale]", "(shop)");

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

async function shopLoadingFiles(): Promise<string[]> {
  const files = await walk(SHOP_ROOT);
  return files.filter((file) => path.basename(file) === "loading.tsx");
}

describe("the loading surfaces cost no JavaScript", () => {
  // The budget argument, asserted rather than described. The landing route
  // measures 199.8 kB against a 200 kB hard fail (`pnpm check:budget`), and the
  // shop chrome is paid by all 23 shop routes -- so a `"use client"` added to
  // any of these is not a style regression, it is P15.S3's acceptance criterion
  // failing. A future HiggsField swap must keep them Server Components; see
  // WorkshopLoader.tsx, which is the seam that swap goes through.
  const SERVER_ONLY = [
    "components/landing/HeroV2/StageSkeleton.tsx",
    "components/loading/WorkshopLoader.tsx",
    "components/loading/ShopRouteLoader.tsx",
  ];

  it.each(SERVER_ONLY)("%s is a Server Component", async (rel) => {
    const source = await readFile(path.join(WEB_ROOT, rel), "utf8");
    expect(/^\s*["']use client["']/m.test(source)).toBe(false);
  });
});

/**
 * Three guards for the three things a `loading.tsx` breaks in this app, each of
 * which P15.S3 shipped, measured and then reverted. `ShopRouteLoader`'s comment
 * carries the numbers; this file is what stops any of them coming back quietly.
 *
 * None of them is a style rule. A loading boundary makes Next flush a streaming
 * shell, and **once the shell is flushed the response is committed**: a
 * prerendered route becomes a curtain with its content in a `<div hidden>`, a
 * `notFound()` becomes HTTP 200, and a `redirect()` becomes a
 * `<meta http-equiv="refresh">` -- which is also a live axe violation
 * (WCAG 2.2.1).
 *
 * The shop group has **no** `loading.tsx` today, because every dynamic route in
 * it does one of the last two after its await. These assertions therefore pass
 * vacuously right now, on purpose: they exist for the commit that adds the
 * first one back.
 */
describe("a loading boundary only goes where it costs nothing", () => {
  it("is scanning the real route tree", async () => {
    // The anti-rot guard. It cannot be "there is at least one loading.tsx" --
    // there are legitimately none -- so it asserts the scan reaches the pages
    // instead. A moved or renamed route group would otherwise disarm the whole
    // file silently.
    const pages = (await walk(SHOP_ROOT)).filter((f) => path.basename(f) === "page.tsx");
    expect(pages.length).toBeGreaterThanOrEqual(20);
  });

  it("never wraps a statically prerendered route", async () => {
    // Whether a route is dynamic is not knowable from source alone, so this
    // approximates `pnpm build`'s `ƒ` with the property that actually decides
    // it here: a `[param]` segment in the path. That matches every dynamic shop
    // route today and, to the point, excludes the `(shop)` group root -- where
    // this started, and where it cost the landing 208 ms of LCP.
    const loaders = (await shopLoadingFiles()).map((file) =>
      path.relative(SHOP_ROOT, file).split(path.sep).join("/"),
    );
    const onStaticRoute = loaders.filter((rel) => !rel.includes("["));

    expect(
      onStaticRoute,
      `These loading.tsx files sit on statically prerendered routes:\n  ${onStaticRoute.join("\n  ")}\n` +
        `Next builds such a route as a streaming shell: the loader paints and the real page ships ` +
        `hidden behind it, revealed by a script at the end of the document.`,
    ).toEqual([]);
  });

  it("never sits beside a page that answers with a status or a redirect", async () => {
    // The half no reviewer would think to check, and the one that ended this
    // deliverable. A/B'd on one build pipeline in one session:
    //
    //   /c/x /p/x /brand/x /vehicle/x   404 without a loading.tsx, 200 with one
    //   /orders/x (unauthenticated)     307 + Location without, 200 +
    //                                   <meta http-equiv="refresh"> with
    //
    // Four soft 404s on the routes the catalogue's SEO depends on, and a
    // meta refresh that axe reports as a WCAG 2.2.1 violation.
    const offenders: string[] = [];
    for (const file of await shopLoadingFiles()) {
      const page = path.join(path.dirname(file), "page.tsx");
      const source = await readFile(page, "utf8").catch(() => "");
      if (/\bnotFound\s*\(\s*\)/.test(source) || /\bredirect\s*\(/.test(source)) {
        offenders.push(path.relative(SHOP_ROOT, file).split(path.sep).join("/"));
      }
    }

    expect(
      offenders,
      `These loading.tsx files sit beside a page that calls notFound() or redirect():\n  ${offenders.join("\n  ")}\n` +
        `The shell is flushed before the page reaches that branch, so the response is already ` +
        `committed: the 404 goes soft and the redirect degrades to a meta refresh. Move that ` +
        `decision ahead of the flush -- generateMetadata is resolved before Next streams -- before ` +
        `putting a loader on such a route.`,
    ).toEqual([]);
  });

  it("routes every one of them through the single seam component", async () => {
    // The point of the seam is that the owner's HiggsField animation replaces
    // ONE component; a loading.tsx that renders its own markup would quietly
    // opt that route out of the swap.
    for (const file of await shopLoadingFiles()) {
      const source = await readFile(file, "utf8");
      expect(source, path.relative(WEB_ROOT, file)).toContain(
        'export { ShopRouteLoader as default } from "@/components/loading";',
      );
    }
  });
});
