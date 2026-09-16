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

async function shopFiles(basename: string): Promise<string[]> {
  const files = await walk(SHOP_ROOT);
  return files.filter((file) => path.basename(file) === basename);
}

const shopLoadingFiles = () => shopFiles("loading.tsx");

/** `.../(shop)/c/[slug]/loading.tsx` -> `c/[slug]`, in POSIX form. */
function segmentOf(file: string): string {
  return path.relative(SHOP_ROOT, path.dirname(file)).split(path.sep).join("/");
}

/**
 * Does this layout resolve the route's not-found / redirect decision itself?
 *
 * Source-level, because whether an `await` lands above or below a Suspense
 * boundary is a question about file placement, which is exactly what is
 * knowable from the tree and exactly what gets broken by accident.
 */
async function decidesInLayout(layoutFile: string): Promise<boolean> {
  const source = await readFile(layoutFile, "utf8").catch(() => "");
  return /\bnotFound\s*\(\s*\)/.test(source) || /\bredirect\s*\(/.test(source);
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
 * What a `loading.tsx` may and may not do in this app.
 *
 * A loading boundary makes Next flush a streaming shell, and **once the shell
 * is flushed the response is committed**: a prerendered route becomes a curtain
 * with its content in a `<div hidden>`, a `notFound()` becomes HTTP 200, and a
 * `redirect()` becomes a `<meta http-equiv="refresh">` -- which is also a live
 * axe violation (WCAG 2.2.1). P15.S3 measured all three and shipped no loader
 * at all as a result.
 *
 * **P15.S10 qualified four routes, and these assertions describe how.** The
 * decision moved out of the page and into a sibling `layout.tsx`: a
 * `loading.tsx` wraps only its segment's *page* in Suspense, so the segment's
 * own layout sits above the boundary and its `await` still blocks the first
 * flush. Measured on a production build: `/c/{unknown}` 404 with the localised
 * body, `/c/engine` 200.
 *
 * **The rewritten assertion, and why the old one had to go.** This file used to
 * fail any `loading.tsx` whose sibling `page.tsx` mentioned `notFound()` --
 * which the correct design still does, because each page keeps its own check as
 * a second line of defence and stays correct with or without the boundary. That
 * test would have blocked the fix it was written to ask for. The invariant that
 * actually matters is not "the page never decides", it is **"a deciding `await`
 * is never inside the boundary"**, which is a question about where files sit.
 */
describe("a loading boundary only goes where it costs nothing", () => {
  it("is scanning the real route tree", async () => {
    // The anti-rot guard: a moved or renamed route group would otherwise
    // disarm the whole file silently by finding nothing to check.
    const pages = (await walk(SHOP_ROOT)).filter((f) => path.basename(f) === "page.tsx");
    expect(pages.length).toBeGreaterThanOrEqual(20);
    expect((await shopLoadingFiles()).length).toBeGreaterThanOrEqual(4);
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

  it("resolves its route's not-found decision in a sibling layout", async () => {
    // The half no reviewer would think to check, and the one that ended P15.S3.
    // A/B'd on one build pipeline in one session:
    //
    //   /c/x /p/x /brand/x /vehicle/x   404 without a loading.tsx, 200 with one
    //   /orders/x (unauthenticated)     307 + Location without, 200 +
    //                                   <meta http-equiv="refresh"> with
    //
    // Four soft 404s on the routes the catalogue's SEO depends on, and a meta
    // refresh that axe reports as a WCAG 2.2.1 violation.
    //
    // A sibling `layout.tsx` is what fixes it, and the ONLY thing measured to:
    // `loading.tsx` wraps the segment's page in Suspense, the layout sits above
    // that boundary, so the layout's `await` still blocks the first flush.
    //
    // NOT `generateMetadata`, which this assertion's own failure message used to
    // recommend as fact. Next 15.2 made metadata streaming: it renders inside a
    // Suspense boundary of its own and no longer gates the shell, so a
    // `notFound()` there answers 200 on 15.5.21 -- measured -- and drops the
    // visitor on Next's built-in English, LTR 404.
    const offenders: string[] = [];
    for (const file of await shopLoadingFiles()) {
      const layout = path.join(path.dirname(file), "layout.tsx");
      if (!(await decidesInLayout(layout))) offenders.push(segmentOf(file));
    }

    expect(
      offenders,
      `These segments have a loading.tsx but no layout.tsx that resolves not-found:\n  ${offenders.join("\n  ")}\n` +
        `The shell is flushed before the PAGE reaches its notFound()/redirect(), so the response ` +
        `is already committed: the 404 goes soft and the redirect degrades to a meta refresh. ` +
        `Add a layout.tsx in the same folder that awaits the fetcher and calls notFound() on ` +
        `reason === "not-found" only -- an API outage must still render the page's EmptyState.`,
    ).toEqual([]);
  });

  it("never sits above a deeper segment that makes its own decision", async () => {
    // The trap the four-route rollout actually hit, measured rather than
    // reasoned: a loading.tsx wraps EVERYTHING below its segment, nested layouts
    // included. With one at `vehicle/[make]/`, the `[model]/[gen]` layout landed
    // inside that boundary and `/vehicle/saipa/pride-111/1999` answered **200**
    // with the 404 body -- a soft 404 that the assertion above cannot see,
    // because that segment does have its own deciding layout.
    //
    // This is why `vehicle/[make]` has no loader. It loses nothing: its page's
    // only fetch is the one its decision would already have made, so the loader
    // would live for about zero milliseconds.
    const loaderSegments = (await shopLoadingFiles()).map(segmentOf);
    const offenders: string[] = [];

    for (const layout of await shopFiles("layout.tsx")) {
      if (!(await decidesInLayout(layout))) continue;
      const segment = segmentOf(layout);
      for (const loader of loaderSegments) {
        if (segment !== loader && segment.startsWith(`${loader}/`)) {
          offenders.push(`${loader}/loading.tsx  swallows  ${segment}/layout.tsx`);
        }
      }
    }

    expect(
      offenders,
      `These loading.tsx files sit ABOVE a layout that decides not-found:\n  ${offenders.join("\n  ")}\n` +
        `The deeper layout renders inside the higher Suspense boundary, so its await no longer ` +
        `blocks the flush and its notFound() answers 200. Put the loader at the deciding segment, ` +
        `not above it.`,
    ).toEqual([]);
  });

  it("never leaves a not-found.tsx in the same segment as the layout that decides", async () => {
    // The regression this step shipped once and the owner reversed. Moving the
    // decision into `c/[slug]/layout.tsx` made `c/[slug]/not-found.tsx`
    // unreachable -- React catches a layout's notFound() ABOVE that layout's own
    // segment -- so «کالا یافت نشد» and «دسته‌بندی یافت نشد» silently stopped
    // rendering and every catalogue 404 fell through to the group's generic
    // copy. Nothing failed; the pages still 404'd, just with the wrong sentence.
    //
    // The three boundaries now sit one segment up (`c/`, `brand/`, `p/`), which
    // is where they are eligible. This fails if one is moved back down.
    const offenders: string[] = [];
    for (const notFound of await shopFiles("not-found.tsx")) {
      const layout = path.join(path.dirname(notFound), "layout.tsx");
      if (await decidesInLayout(layout)) offenders.push(segmentOf(notFound));
    }

    expect(
      offenders,
      `These segments hold BOTH a deciding layout.tsx and a not-found.tsx:\n  ${offenders.join("\n  ")}\n` +
        `A layout's notFound() is caught above its own segment, so that not-found.tsx can never ` +
        `render and its specific copy is dead. Move it up one segment -- to the parent of the ` +
        `[param] folder -- where it is the nearest eligible boundary.`,
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
