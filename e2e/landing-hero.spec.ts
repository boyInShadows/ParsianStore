import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * P9.S6 — the proof pass for the rebuilt hero. Everything the scaffold could
 * only assert about its own data (heroLayout.test.ts) is asserted here against
 * the page that actually renders.
 */

async function gotoHero(page: Page) {
  await page.goto("/");
  await page.locator("#hero").waitFor();
}

test("hero has zero axe violations", async ({ page }) => {
  await gotoHero(page);
  const results = await new AxeBuilder({ page }).include("#hero").analyze();
  expect(results.violations).toEqual([]);
});

test("hero has zero axe violations in dark mode", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await gotoHero(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const results = await new AxeBuilder({ page }).include("#hero").analyze();
  expect(results.violations).toEqual([]);
});

test("the page renders RTL in Persian", async ({ page }) => {
  await gotoHero(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});

test("the diagram exposes exactly the layers the layout declares", async ({ page }) => {
  await gotoHero(page);
  const stage = page.locator(".hero-stage");
  await expect(stage).toHaveAttribute("role", "group");
  // 1 stripped base + 8 docked layers (7 sprites, the headlights render placed
  // twice and clipped to one lamp each) + 3 engine parts under the hood
  // (P12.S3). A missing render would show up here as a short count rather than
  // as a silently broken image.
  await expect(stage.locator("img")).toHaveCount(12);
});

test("the diagram is pinned LTR so the dock does not mirror under RTL", async ({ page }) => {
  await gotoHero(page);
  // The page is RTL and the renders are never mirrored, so an unpinned stage
  // would measure `insetInlineStart` from the right and dock the bumper onto
  // the back of a car facing the other way.
  await expect(page.locator(".hero-stage")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("every part render resolves — no broken images in the diagram", async ({ page }) => {
  await gotoHero(page);
  const broken = await page
    .locator(".hero-stage img")
    .evaluateAll((images) =>
      images
        .filter(
          (image) =>
            !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0,
        )
        .map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src),
    );
  expect(broken).toEqual([]);
});

test("the hero serves the pre-built AVIF set, not the request-time optimizer", async ({ page }) => {
  await gotoHero(page);
  const sources = await page
    .locator(".hero-stage img")
    .evaluateAll((images) => images.map((image) => (image as HTMLImageElement).currentSrc));
  for (const source of sources) {
    // Two directories, one rule: the car's own panels come from `hero`, the
    // engine internals from `hero-parts`. Both are pipeline output, and neither
    // may fall through to the request-time optimizer.
    expect(source).toMatch(/\/landing\/hero(-parts)?\/[a-z-]+-\d+\.avif$/);
    expect(source).not.toContain("/_next/image");
  }
});

test("every system in the index rail links somewhere real", async ({ page }) => {
  await gotoHero(page);
  const links = page.locator("#hero a[href^='/c/']");
  await expect(links).toHaveCount(10);

  for (const href of await links.evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
  )) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test("the whole hero is reachable by keyboard, with a visible focus ring", async ({ page }) => {
  await gotoHero(page);

  const reached: string[] = [];
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || !element.closest("#hero")) return null;
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40) ?? "",
        // A focus ring must be *visible*: either an outline with real width or
        // a box-shadow standing in for one.
        hasRing: (parseFloat(style.outlineWidth) || 0) > 0 || style.boxShadow !== "none",
      };
    });
    if (!focused) continue;
    expect(focused.hasRing, `${focused.tag} "${focused.name}" has no visible focus ring`).toBe(
      true,
    );
    reached.push(`${focused.tag}:${focused.name}`);
  }

  // The two entry paths and the index rail all have to be on the tab order.
  expect(reached.some((entry) => entry.startsWith("input"))).toBe(true);
  expect(reached.some((entry) => entry.startsWith("button"))).toBe(true);
  expect(reached.filter((entry) => entry.startsWith("a:")).length).toBeGreaterThanOrEqual(10);
});

test("the part-code field sends a typed code into search", async ({ page }) => {
  await gotoHero(page);
  const field = page.locator("#hero input[name='code']");
  await field.fill("۰۴۴۶۵-YZZ");
  await field.press("Enter");
  await page.waitForURL(/\/search\?/);
  // Persian digits normalize to Latin before the query is built.
  expect(new URL(page.url()).searchParams.get("q")).toBe("04465-YZZ");
});

test("an empty part code is refused instead of searching for nothing", async ({ page }) => {
  await gotoHero(page);
  await page.locator("#hero input[name='code']").press("Enter");
  await expect(page.locator("#hero [role='alert']")).toBeVisible();
  expect(page.url()).not.toContain("/search");
});

test("reduced motion still shows a whole car, docked", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await gotoHero(page);

  // The inverse of what this test used to assert, and the reason it had to be
  // rewritten rather than deleted. The v1 stage opened with every part
  // collapsed onto the car, so reduced motion had to jump to the *separated*
  // end state and the CSS backstop cleared the layers' transforms to get
  // there. The docked model opens finished: clearing those same transforms
  // would now undock every sprite and scatter the parts for exactly the
  // visitor who asked for less movement.
  //
  // Proved geometrically: each layer's box must still overlap the base's box.
  // A part flung off the car fails this; a part sitting on it cannot.
  const overlaps = await page.locator(".hero-stage img").evaluateAll((images) => {
    const [base, ...layers] = images.map((image) => image.getBoundingClientRect());
    return layers.map(
      (box) =>
        box.right > base.left &&
        box.left < base.right &&
        box.bottom > base.top &&
        box.top < base.bottom,
    );
  });
  // 8 sprites + 3 engine parts. The engine parts are the strictest case of the
  // rule rather than an exception to it: they sit inside the bay the hood
  // covers, so if a transform ever moved them at rest they would not merely
  // scatter, they would appear -- out of a car that is supposed to be closed.
  expect(overlaps.length).toBe(11);
  expect(overlaps.every(Boolean)).toBe(true);

  await context.close();
});

/**
 * Scroll the hero's own track to a fraction of its travel and let it settle.
 *
 * The track's position is read in *document* coordinates, not from
 * `boundingBox()`. That returns a viewport-relative box, so re-measuring after
 * an earlier scroll aims at a target that has already moved -- which reads as
 * "the scroll worked but nothing animated", the most confusing possible
 * failure for a scroll-linked test.
 */
async function scrollHeroTo(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const track = document.querySelector(".hero-track")!;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.getBoundingClientRect().height - window.innerHeight;
    window.scrollTo(0, top + travel * f);
  }, fraction);
  await page.waitForTimeout(300);
}

/** Every layer's box relative to the base's, in the stage's own pixels. */
async function layerOffsets(page: Page) {
  return page.locator(".hero-stage img").evaluateAll((images) => {
    const [base, ...layers] = images.map((image) => image.getBoundingClientRect());
    return layers.map((box) => ({
      x: box.left - base.left,
      y: box.top - base.top,
    }));
  });
}

test("scrolling the hero undocks the parts and docks them again", async ({ page }) => {
  await gotoHero(page);
  // 0.18 and 0.83 are the peaks of chapters 1 and 3; 0.34 is the rest beat
  // between 1 and 2. CHAPTER_RANGE is what those numbers come from.
  await scrollHeroTo(page, 0);
  const docked = await layerOffsets(page);

  await scrollHeroTo(page, 0.18);
  const front = await layerOffsets(page);
  const moved = front.filter(
    (box, i) => Math.hypot(box.x - docked[i].x, box.y - docked[i].y) > 8,
  ).length;
  // Chapter 1 is bumper, grille and the two lamps -- four of the eight.
  expect(moved, "nothing left the car at the peak of chapter 1").toBe(4);

  // The whole point of sequential chapters: the car is whole again in between,
  // not a cloud of panels accumulating down the page.
  await scrollHeroTo(page, 0.34);
  const between = await layerOffsets(page);
  for (const [i, box] of between.entries()) {
    expect(
      Math.hypot(box.x - docked[i].x, box.y - docked[i].y),
      `layer ${i} never came back between chapters`,
    ).toBeLessThan(9);
  }

  // A different group leaves in chapter 3 -- door, fender, windshield.
  await scrollHeroTo(page, 0.83);
  const body = await layerOffsets(page);
  const movedLate = body.filter(
    (box, i) => Math.hypot(box.x - docked[i].x, box.y - docked[i].y) > 8,
  ).length;
  expect(movedLate, "chapter 3 moved a different number of parts than it owns").toBe(3);
});

test("the hero ends its scroll as a whole car, not a pile of panels", async ({ page }) => {
  await gotoHero(page);
  await scrollHeroTo(page, 0);
  const docked = await layerOffsets(page);
  await scrollHeroTo(page, 1);
  for (const [i, box] of (await layerOffsets(page)).entries()) {
    expect(
      Math.hypot(box.x - docked[i].x, box.y - docked[i].y),
      `layer ${i} is still in the air at the end of the track`,
    ).toBeLessThan(9);
  }
});
