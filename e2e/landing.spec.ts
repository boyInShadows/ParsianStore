import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * P9.S16 -- the whole-page regression pass for the Phase 9 rebuild, and the
 * closing of 2026-08-14 audit item 7 ("nothing guards the landing page as a
 * page"). Per-beat behaviour stays in `landing-sections.spec.ts`; what lives
 * here is what only the assembled page can prove: it renders the same at every
 * width in both themes, every link out of it resolves, and it stays free of
 * axe violations in every combination the DoD names.
 */

const VIEWPORTS = [
  { name: "360", width: 360, height: 900 },
  { name: "390", width: 390, height: 900 },
  { name: "1440", width: 1440, height: 900 },
];

const THEMES = ["light", "dark"] as const;

/** Long enough for the API-backed sections; a precondition, never the assertion. */
const SECTION_RENDER = 45_000;

async function openLanding(page: Page, theme: (typeof THEMES)[number]) {
  // next-themes reads localStorage in a blocking inline script, so setting it
  // before navigation is what makes the very first paint the right theme --
  // emulateMedia alone would leave `data-theme` unset and race hydration.
  await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  await page.emulateMedia({ colorScheme: theme });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.locator("#hero").waitFor();
  // The last beat sits below every API-backed section, so its presence means
  // the page is fully assembled rather than captured mid-stream.
  await expect(page.locator("#closing")).toHaveCount(1, { timeout: SECTION_RENDER });
}

/**
 * Everything a full-page capture needs to have finished, done explicitly.
 *
 * Without this the suite is flaky exactly once in a while and only under load:
 * `360px light` failed in a full parallel run and passed alone. Two real
 * causes, both invisible to a `waitFor` on an element: below-the-fold images
 * are `loading="lazy"` and only start fetching as the capture scrolls past
 * them, and a webfont that has not finished swapping repaints every line of
 * text a pixel or two off. Scrolling the page once forces the lazy set to
 * commit, then both are awaited before anything is compared.
 */
async function settleForCapture(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // Bounded on purpose. Awaiting each pending image's own load event hung the
  // reduced-motion tests outright: a `loading="lazy"` image that never enters
  // the viewport stays `complete === false` forever, so the promise never
  // settled. This waits for the same condition and gives up rather than
  // failing the run on a decorative image below the fold.
  await page
    .waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      undefined,
      {
        timeout: 5_000,
      },
    )
    .catch(() => undefined);
}

/**
 * The only thing on this page that renders differently from one capture to the
 * next: a `<video>` shows whichever frame it happens to be on.
 *
 * Nothing else is masked, deliberately. The first version of this suite masked
 * every API-backed section and the footer -- six blocks that sit next to each
 * other, so the baseline came out with a single magenta slab over roughly 40%
 * of the page and could not have caught a layout regression anywhere inside
 * it. The catalogue seed is committed and idempotent, so those sections render
 * the same on every run; a deliberate reseed is the one thing that
 * invalidates these baselines, and the fix for that is
 * `pnpm e2e e2e/landing.spec.ts --update-snapshots`, not a permanent blindfold.
 *
 * Infinite CSS animations (the brand marquee) need no mask either: Playwright's
 * `animations: "disabled"` rewinds them to their first frame, which is
 * deterministic.
 */
function volatileRegions(page: Page) {
  return [page.locator("video")];
}

test.describe("landing page visual regression (S16)", () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${viewport.name}px ${theme} matches its baseline`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openLanding(page, theme);
        await settleForCapture(page);

        await expect(page).toHaveScreenshot(`landing-${viewport.name}-${theme}.png`, {
          fullPage: true,
          animations: "disabled",
          mask: volatileRegions(page),
          // Font rasterisation moves by a pixel or two between runs on the
          // same machine; a hard zero would fail on nothing real.
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}px honours prefers-reduced-motion`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // This used to measure the hero's pin and its track collapsing, because
      // the v1 diagram bought a screen and a half of scroll to play a
      // separation over and had to hand that spacer back to a reduced-motion
      // visitor. P9.S5 part 2 replaced that stage with a docked car that is
      // finished at rest and buys no scroll at all, so there is no apparatus
      // left to collapse -- and the honest assertion is now that the hero
      // costs the same either way rather than that it shrinks.
      //
      // Compared as a ratio, not to the pixel. Two loads of the same page differ
      // by a line or so at 360px depending on whether the lazily-mounted vehicle
      // selector has swapped in by the time the box is read -- 12px on a
      // ~1900px hero, and nothing to do with motion. The regression this guards
      // is a *pinned track* coming back, which was more than half the hero's
      // height again, so 5% is a floor far below the real signal and far above
      // the noise.
      const heroHeight = async () => (await page.locator("#hero").boundingBox())!.height;

      await openLanding(page, "light");
      const normal = await heroHeight();

      await page.emulateMedia({ reducedMotion: "reduce" });
      await openLanding(page, "light");
      const reduced = await heroHeight();
      expect(
        Math.abs(reduced - normal) / normal,
        `the hero measures ${normal}px normally and ${reduced}px under reduced motion -- ` +
          `a gap that size means it is carrying scroll travel it cannot use`,
      ).toBeLessThan(0.05);

      await settleForCapture(page);
      await expect(page).toHaveScreenshot(`landing-${viewport.name}-reduced-motion.png`, {
        fullPage: true,
        animations: "disabled",
        mask: volatileRegions(page),
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("landing page link sweep (S16, audit item 7)", () => {
  test("every discovery link on the page resolves", async ({ page }) => {
    // Forty-odd server renders in one test. The default 30s budget is written
    // for a test that drives a page, not one that asks a dev server to compile
    // a third of the site while nine other workers do the same -- it timed out
    // here twice, both times with every link actually answering 200.
    test.setTimeout(180_000);
    await openLanding(page, "light");

    // Internal links only: tel: and https://t.me/... are real destinations
    // this suite has no business calling.
    const hrefs = await page
      .locator("a[href^='/']")
      .evaluateAll((anchors) =>
        Array.from(new Set(anchors.map((anchor) => anchor.getAttribute("href") ?? ""))),
      );

    // The audit found whole families of these 404ing at once (every vehicle
    // link, then every footer make link). A count floor makes a page that
    // silently stopped rendering its links fail here rather than pass empty.
    expect(hrefs.length, "the landing page offers almost no way in").toBeGreaterThan(30);

    // Six at a time rather than one after another: the wall-clock cost here is
    // almost entirely the dev server's first compile of each route, and those
    // overlap happily. Each link is asked twice before being called broken --
    // under load a route occasionally 500s once and serves fine immediately
    // after, while a genuinely missing one answers 404 both times, so nothing
    // real is retried away.
    const check = async (href: string) => {
      let status = (await page.request.get(href)).status();
      if (status !== 200) status = (await page.request.get(href)).status();
      return status === 200 ? null : `${status} ${href}`;
    };

    const broken: string[] = [];
    for (let index = 0; index < hrefs.length; index += 6) {
      const batch = await Promise.all(hrefs.slice(index, index + 6).map(check));
      broken.push(...batch.filter((entry): entry is string => entry !== null));
    }
    expect(broken).toEqual([]);
  });

  test("no link stops short of a real destination", async ({ page }) => {
    await openLanding(page, "light");

    // `/vehicle/{make}/{model}` was never a route (audit item 1) and
    // `/vehicle/{make}` only became one at S15. Both shapes are legitimate
    // now except the middle one, which still has no page.
    const modelOnly = await page
      .locator("a[href^='/vehicle/']")
      .evaluateAll((anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter((href) => href.split("/").filter(Boolean).length === 3),
      );
    expect(modelOnly).toEqual([]);
  });
});

test.describe("landing page accessibility sweep (S16)", () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`zero axe violations at ${viewport.name}px in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await openLanding(page, theme);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }

  test("tabbing moves through the page and never leaves the document", async ({ page }) => {
    await openLanding(page, "light");

    // Walk the first stretch of the tab order. A focus trap shows up as the
    // same element every time; a lost focus shows up as body.
    const seen = new Set<string>();
    for (let step = 0; step < 25; step += 1) {
      await page.keyboard.press("Tab");
      const id = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        return `${element.tagName}:${element.getAttribute("href") ?? element.textContent?.slice(0, 24) ?? ""}`;
      });
      if (id) seen.add(id);
    }
    expect(seen.size, "tabbing moves through almost nothing").toBeGreaterThan(5);
  });
});
