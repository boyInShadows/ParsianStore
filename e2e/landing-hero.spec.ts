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
  // Scoped to the index's own list, not to every /c/ link in the hero: the
  // parts manifest (P12.S4) also links into categories, so `#hero a[href^=/c/]`
  // now matches both and this stopped being a count of the systems.
  const links = page.locator("ul[aria-labelledby='shop-by-system-heading'] a[href^='/c/']");
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

/**
 * The parts manifest (P12.S4/S5). Two renderings of one list -- a desktop side
 * panel and a mobile chip rail -- with CSS showing exactly one.
 */
test.describe("parts manifest", () => {
  test("shows exactly one of its two forms, and never both", async ({ page }) => {
    await gotoHero(page);
    const navs = page.locator("#hero nav[aria-label]");
    // Both are in the DOM; `hidden` is display:none, so only one is in the
    // accessibility tree and there is never a duplicate navigation landmark.
    await expect(navs).toHaveCount(2);
    await expect(navs.filter({ visible: true })).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 760 });
    await expect(navs.filter({ visible: true })).toHaveCount(1);
  });

  // The bug class this repo keeps hitting: a utility that is off the config's
  // REPLACED spacing scale generates no CSS at all, so the element silently
  // falls back to content sizing. `w-36` did exactly that here and the chips
  // measured 74px to 99px; the audit's own item 2 was a `w-64` card computing
  // to 992px. A width assertion catches the whole family.
  test("sizes every chip in the mobile rail identically", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await gotoHero(page);
    const widths = await page
      .locator("#hero nav[aria-label] ol li")
      .filter({ visible: true })
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)));
    expect(widths.length).toBeGreaterThan(0);
    expect(new Set(widths).size, `ragged chip widths: ${widths.join(", ")}`).toBe(1);
  });

  // The rail is a horizontal scroller inside a grid item, and a grid item's
  // automatic minimum size is its min-content width -- so without `min-w-0` the
  // column refuses to shrink below the rail's unwrapped 1248px and overflows a
  // 390px track. `overflow-x-clip` on #hero then hides it: nothing looks wrong,
  // the page does not scroll sideways, but the vehicle selector and all ten
  // system links sit at x=-875, off-canvas and unreachable. Asserting on
  // document scroll width would have caught none of it, so this measures the
  // columns against the section that clips them.
  test("keeps every hero column inside the viewport at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await gotoHero(page);
    const overflowing = await page.locator("#hero .grid > *").evaluateAll((columns) => {
      const limit = document.querySelector("#hero")!.getBoundingClientRect();
      return columns
        .map((column) => ({ rect: column.getBoundingClientRect(), cls: column.className }))
        .filter(({ rect }) => rect.left < limit.left - 1 || rect.right > limit.right + 1)
        .map(({ rect, cls }) => `${cls} @ x=${Math.round(rect.x)} w=${Math.round(rect.width)}`);
    });
    expect(overflowing, overflowing.join(" | ")).toEqual([]);
  });

  // The desktop axe runs at 1280 wide, where the rail is display:none and axe
  // skips it entirely -- so without this the mobile half of P12.S5 ships
  // unaudited. Same include, different viewport.
  test("the mobile rail has zero axe violations, in both themes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
      await gotoHero(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      // Audit the state a visitor actually reads. The server sends every chip
      // present, the client leaf then takes them away to check them back in, so
      // an audit fired on load lands mid-fade and axe scores the blended colour
      // of half-transparent text -- a timing artefact, not a contrast defect.
      // Scroll the chapters in, then wait for the opacity to settle.
      // Walks down rather than jumping to `document.body.scrollHeight`: the page
      // is still growing as its lazy images commit, so a single jump lands
      // mid-hero, leaves the later chapters unchecked-in, and then waits forever
      // for chips that were never asked to arrive.
      await page.waitForFunction(
        () => {
          const chips = [...document.querySelectorAll("#hero .manifest-chip")];
          if (chips.length > 0 && chips.every((chip) => getComputedStyle(chip).opacity === "1")) {
            return true;
          }
          window.scrollBy(0, window.innerHeight);
          return false;
        },
        undefined,
        { polling: 250 },
      );

      const results = await new AxeBuilder({ page }).include("#hero").analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  // ICU's plain `{count}` is a string substitution, not a number format, so a
  // Persian message interpolating it renders Latin digits -- "32 قطعه" sitting
  // inside Persian copy. The repo's answer is `toPersianDigits`, and this
  // asserts on the rendered text rather than on the call, so it also covers the
  // ten system links beside the manifest, which had the same gap.
  test("renders every count in Persian digits", async ({ page }) => {
    await gotoHero(page);
    const counts = await page
      .locator("#hero a:has-text('قطعه')")
      .evaluateAll((links) =>
        links.map((link) => link.textContent ?? "").filter((text) => /قطعه/.test(text)),
      );
    expect(counts.length).toBeGreaterThan(0);
    const latin = counts.filter((text) => /[0-9]+\s*قطعه/.test(text));
    expect(latin, `Latin digits in Persian copy: ${latin.join(" | ")}`).toEqual([]);
  });

  test("every manifest link resolves", async ({ page }) => {
    await gotoHero(page);
    const hrefs = await page
      .locator("#hero nav[aria-label] a")
      .evaluateAll((links) => [...new Set(links.map((l) => l.getAttribute("href") ?? ""))]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect((await page.request.get(href)).status(), href).toBe(200);
    }
  });

  // §2.3: the list is a list before it is choreography. Without JavaScript the
  // client leaf never runs, so every row has to be present already -- which is
  // why the server renders the last chapter rather than the first.
  test("shows every row with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    const rows = page.locator("#hero nav[aria-label] ol li");
    await expect(rows.first()).toBeVisible();
    await expect(await rows.count()).toBeGreaterThan(5);
    await context.close();
  });
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
