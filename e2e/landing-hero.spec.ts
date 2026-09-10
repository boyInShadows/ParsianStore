import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  CHAPTER_RANGE,
  CHAPTER_SEQUENCE,
  FINALE_BEAT,
  beatFor,
  coverOf,
} from "../apps/web/components/landing/HeroV2/heroLayout";

/**
 * Inside the finale's hold every part is in the air at once (P13.S8).
 *
 * This is the one place the "exactly one slot is away" invariant does not
 * apply, and it does not apply *by definition* rather than by accident: the
 * finale is the beat where the whole catalogue is on screen. Chapter 3's last
 * slot runs to 0.980 and the finale opens at 0.860, so several of the derived
 * sample points land inside it.
 *
 * **The hold now runs to the end of the track** (P14.S5). `FINALE_BEAT[2]` was
 * 0.96, with a fourth value at 1.0 that brought every part home again; the
 * owner reversed that on 2026-09-07, so p=1 is inside the finale and the last
 * frame of the hero is the exploded catalogue. Because this predicate is
 * derived from the constant rather than written down, the end-of-track sample
 * in `holdSamples()` re-classifies itself.
 */
const inFinale = (at: number) => at >= FINALE_BEAT[1] && at <= FINALE_BEAT[2];

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

  // The hero is a diagram and a job card now: every row, and nothing that is
  // not a link. P13.S7 moved the vehicle selector and the code field to
  // `#find-my-part`, which is asserted separately below -- they were never
  // part of the diagram, and in the hero they pushed the job card off screen.
  expect(reached.filter((entry) => entry.startsWith("a:")).length).toBeGreaterThanOrEqual(9);
});

test("the two entry paths are reachable, in their own section", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#find-my-part");
  await section.waitFor();

  await expect(section.locator("input[name='code']")).toHaveCount(1);
  await expect(section.locator("button")).not.toHaveCount(0);
  // The system index came with them: ten cards, each a real category route.
  const links = section.locator("ul[aria-labelledby='shop-by-system-heading'] a[href^='/c/']");
  await expect(links).toHaveCount(10);

  // The closing beat's CTA and the hero's finale button both target this.
  await expect(page.locator("#driver-path")).toHaveCount(1);
});

test("the part-code field sends a typed code into search", async ({ page }) => {
  await page.goto("/");
  await page.locator("#find-my-part").waitFor();
  const field = page.locator("#find-my-part input[name='code']");
  await field.fill("۰۴۴۶۵-YZZ");
  await field.press("Enter");
  await page.waitForURL(/\/search\?/);
  // Persian digits normalize to Latin before the query is built.
  expect(new URL(page.url()).searchParams.get("q")).toBe("04465-YZZ");
});

test("an empty part code is refused instead of searching for nothing", async ({ page }) => {
  await page.goto("/");
  await page.locator("#find-my-part").waitFor();
  await page.locator("#find-my-part input[name='code']").press("Enter");
  await expect(page.locator("#find-my-part [role='alert']")).toBeVisible();
  expect(page.url()).not.toContain("/search");
});

/**
 * The parts manifest (P12.S4/S5). Two renderings of one list -- a desktop side
 * panel and a mobile chip rail -- with CSS showing exactly one.
 */
test.describe("parts manifest", () => {
  test("renders exactly once, at every width", async ({ page }) => {
    await gotoHero(page);
    const navs = page.locator("#hero nav[aria-label]");
    // Strictly stronger than what this asserted before P13.S7, which was "two
    // are in the DOM and one is display:none". The duplication was measured as
    // the entire Phase 12 TBT regression (130ms -> 261ms against a 200ms
    // budget), so one NODE is the property now, not one visible node.
    await expect(navs).toHaveCount(1);
    await expect(navs.filter({ visible: true })).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 760 });
    await expect(navs).toHaveCount(1);
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
          const chips = [...document.querySelectorAll("#hero .manifest-row")];
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
  await settleHero(page);
}

/**
 * Wait until the scene has stopped moving.
 *
 * It used to be `waitForTimeout(300)`, which was true while progress was the
 * scrollbar itself: the transforms resolved in the same frame as the scroll and
 * 300ms was pure superstition margin. P14.S4 puts a spring between the two, so
 * a jump of the whole track now takes over a second to arrive and a fixed sleep
 * is a coin toss -- one that lands as "the hero ends its scroll as a pile of
 * panels", which is the exact wording of a real bug this suite exists to catch.
 *
 * So it waits for the thing it actually cares about: the sprites' boxes not
 * moving. Nothing else in the stage animates on its own -- the finale's drift
 * is driven by scroll position, not by time -- so four still frames means
 * settled, and the deadline means a genuinely stuck scene fails as an assertion
 * about position rather than as a hang.
 *
 * It returns how many sprites it was watching, and the caller asserts that it
 * was watching some. "Every frame read the same thing" is trivially true of a
 * selector that matches nothing: a markup refactor that renamed `.hero-stage`,
 * or a hydration race that ran this before the sprites existed, would settle in
 * four frames and make every assertion downstream of it vacuous.
 */
async function settleHero(page: Page) {
  const sprites = await page.evaluate(async () => {
    const read = () =>
      [...document.querySelectorAll(".hero-stage img")]
        .map((node) => {
          const box = node.getBoundingClientRect();
          return `${box.left.toFixed(2)},${box.top.toFixed(2)},${box.width.toFixed(2)}`;
        })
        .join("|");
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

    let previous = read();
    let still = 0;
    const deadline = performance.now() + 4000;
    while (performance.now() < deadline) {
      await nextFrame();
      const now = read();
      still = now === previous ? still + 1 : 0;
      previous = now;
      if (still >= 4) break;
    }
    return document.querySelectorAll(".hero-stage img").length;
  });
  expect(
    sprites,
    "settleHero watched nothing — `.hero-stage img` matched no nodes",
  ).toBeGreaterThan(0);
  // The captions and the job card are CSS transitions on a data attribute, not
  // transforms on the sprites, so they finish just after the geometry does.
  await page.waitForTimeout(200);
}

/**
 * Every layer's box relative to the base's, **as a fraction of the base's own
 * width**.
 *
 * The fraction is what makes this survive the camera (P13.S2). These offsets
 * used to be raw pixels, which was fine while the stage was a fixed-size
 * picture: a docked layer sat the same number of pixels from the base at every
 * scroll position. A camera scale multiplies both boxes, so the *difference*
 * between them scales too -- at chapter 1's 1.35 every docked part suddenly
 * measured 35% further from the base than it did at rest, and the suite
 * reported all nine as detached at once. Dividing by a length that scales
 * identically cancels the camera out.
 *
 * It does not cancel the tilt exactly: `rotateX` under a perspective is not an
 * affine transform, so a docked part can still drift by a fraction of a percent
 * of the base's width. That is what `DOCKED_TOLERANCE` is sized against, with
 * the smallest real undock more than four times larger.
 */
async function layerOffsets(page: Page) {
  return page.locator(".hero-stage img").evaluateAll((images) => {
    const [base, ...layers] = images.map((image) => image.getBoundingClientRect());
    return layers.map((box) => ({
      x: (box.left - base!.left) / base!.width,
      y: (box.top - base!.top) / base!.width,
    }));
  });
}

/**
 * The same, keyed by name so an assertion can say what moved rather than count.
 *
 * `data-part` where there is one -- those are the manifest's own ids, so this
 * checks the scene against the list the visitor is reading. The windshield has
 * no manifest row (it ships only if a glass category route exists, fableTasks2
 * §2.4), so it falls back to its asset name and is still covered.
 *
 * The two headlight layers deliberately collapse onto one key: they are one
 * part rendered as two clipped instances of the same file, they share a beat,
 * and a test that could tell them apart would be testing the wrong thing.
 */
async function partOffsets(page: Page): Promise<Record<string, { x: number; y: number }>> {
  return page.locator(".hero-stage img").evaluateAll((images) => {
    const base = images[0]!.getBoundingClientRect();
    const out: Record<string, { x: number; y: number }> = {};
    for (const [index, image] of images.entries()) {
      if (index === 0) continue;
      const id =
        image.getAttribute("data-part") ??
        /\/landing\/hero\/([a-z-]+?)-\d+\./.exec(image.currentSrc || image.src)?.[1];
      if (!id) continue;
      const box = image.getBoundingClientRect();
      out[id] = { x: (box.left - base.left) / base.width, y: (box.top - base.top) / base.width };
    }
    return out;
  });
}

/**
 * How far a part may sit from its resting place and still count as docked,
 * as a fraction of the base car's width.
 *
 * 0.03 is about 18px at the desktop stage. It has to clear two sources of
 * noise -- sub-pixel layout, and the non-affine drift the chapter-2 tilt adds
 * -- while staying far below a real separation. The smallest undock in the
 * scene is the grille's 117 canvas pixels, which is 0.14 of the car's 823, so
 * there is more than four times the margin between "noise" and "moved".
 */
const DOCKED_TOLERANCE = 0.03;

/** Which parts are away from where they sit at rest. */
function awayFrom(
  docked: Record<string, { x: number; y: number }>,
  now: Record<string, { x: number; y: number }>,
): string[] {
  return Object.keys(now)
    .filter(
      (id) => Math.hypot(now[id]!.x - docked[id]!.x, now[id]!.y - docked[id]!.y) > DOCKED_TOLERANCE,
    )
    .sort();
}

/**
 * P12.S6. This used to assert that the peak of chapter 1 had "four of the eight"
 * layers in the air -- a faithful description of the defect it was written
 * against: a chapter moved everything it owned at once, so it read as one event
 * with several shapes in it rather than as parts you could name.
 *
 * The invariant now is per part. In the middle of a slot's hold, exactly that
 * slot is away from the car (plus its chapter's cover, if it has one) and
 * everything else is home; at every chapter boundary the car is whole.
 *
 * The sample points are DERIVED from `heroLayout.ts`, not written down here.
 * Magic numbers would have to be re-tuned by hand every time BEAT_SPAN or a
 * chapter range moved, and the failure when someone forgot would look like a
 * broken hero rather than a stale test. `heroLayout.ts` has no imports of its
 * own, so a Playwright spec can read it directly.
 */
const CHAPTERS = [1, 2, 3] as const;

/**
 * Ids as they reach the DOM.
 *
 * Only the headlights need mapping now: they are one part drawn as two clipped
 * sprites, so both report the same `data-part`. The windshield used to be here
 * too, falling back to its asset name because it carried no `data-part` at all
 * -- P13.S3 gave it one, since having no category to sell it from is not a
 * reason for it to have no identity on the stage.
 */
const DOM_ID: Record<string, string> = {
  "lamp-far": "headlights",
  "lamp-near": "headlights",
};

type Sample = { at: number; away: string[]; what: string };

function holdSamples(): Sample[] {
  const samples: Sample[] = [{ at: 0, away: [], what: "at rest" }];
  for (const chapter of CHAPTERS) {
    const cover = coverOf(chapter);
    CHAPTER_SEQUENCE[chapter].forEach((ids, slot) => {
      const beat = beatFor(chapter, slot);
      const names = [...new Set(ids.map((id) => DOM_ID[id] ?? id))];
      samples.push({
        // The middle of the hold: the one scroll position where this slot is
        // stationary at its peak and its neighbours have finished or not begun.
        at: (beat[1]! + beat[2]!) / 2,
        away: [...names, ...(cover ? [DOM_ID[cover] ?? cover] : [])],
        what: `chapter ${chapter}, ${names.join(" + ")}${cover ? ` (under an open ${cover})` : ""}`,
      });
    });
    const [, to] = CHAPTER_RANGE[chapter];
    const next = CHAPTER_RANGE[(chapter + 1) as 1 | 2 | 3];
    samples.push({
      at: next ? (to + next[0]) / 2 : 1,
      away: [],
      // `away: []` is what a rest beat between two chapters means, and it is
      // still what the last sample MEANS -- but the last sample sits at p=1,
      // which is now inside the finale, and the caller reads `inFinale` first.
      // So the end of the track asserts the opposite: every part away, none
      // left on the car. Kept as one list rather than split into two because
      // the classification belongs to the beat, not to the sample.
      what: next
        ? `the rest beat after chapter ${chapter}`
        : "the end of the track (held exploded)",
    });
  }
  return samples;
}

test("plays one part at a time, and is a whole car between chapters", async ({ page }) => {
  await gotoHero(page);
  await scrollHeroTo(page, 0);
  const docked = await partOffsets(page);
  expect(Object.keys(docked).length, "the stage lost its identifiable layers").toBeGreaterThan(8);

  for (const step of holdSamples()) {
    await scrollHeroTo(page, step.at);
    // Inside the finale, "one slot at a time" is replaced by "all of them" --
    // and that is still an assertion, not an exemption: a finale that left a
    // part docked would be a catalogue with a hole in it.
    const expected = inFinale(step.at) ? Object.keys(docked).sort() : [...step.away].sort();
    expect(
      awayFrom(docked, await partOffsets(page)),
      `${step.what} @ ${step.at.toFixed(3)}`,
    ).toEqual(expected);
  }
});

/**
 * The ending, rewritten rather than deleted (P14.S5).
 *
 * This test used to be "the hero ends its scroll as a whole car, not a pile of
 * panels", and it asserted every layer within `DOCKED_TOLERANCE` of its resting
 * place at p=1. That was Gate B. The owner reversed Gate B on 2026-09-07
 * (`fableTasks.md` §0.5, and `heroLayout.FINALE_BEAT` records it in the source),
 * so the promise this pins is now the opposite one -- and it is still a promise
 * worth pinning, because "the finale holds" is exactly the kind of ending that
 * regresses silently the next time the transform graph is retuned. An ending
 * nothing tests is an ending that drifts back.
 */
test("the hero ends its scroll exploded, and holds there", async ({ page }) => {
  await gotoHero(page);
  await scrollHeroTo(page, 0);
  const docked = await layerOffsets(page);
  await scrollHeroTo(page, 1);
  for (const [i, box] of (await layerOffsets(page)).entries()) {
    expect(
      Math.hypot(box.x - docked[i].x, box.y - docked[i].y),
      `layer ${i} re-docked at the end of the track -- the finale is supposed to hold`,
    ).toBeGreaterThan(DOCKED_TOLERANCE);
  }
});

/**
 * The other half of "holds": it un-blends on the way back up.
 *
 * Without this, "the finale holds" and "the finale is stuck" look identical to
 * every other assertion in this file. The re-dock threshold is `FINALE_BEAT[0]`
 * and it is deliberately NOT a direction test in the source -- the mix is a
 * plain monotonic function of progress -- so the property to assert is that the
 * scene has no memory: the same scroll position must render the same picture
 * whether the visitor arrived from above or below.
 */
test("the finale un-blends on the way back up, instead of latching", async ({ page }) => {
  await gotoHero(page);
  // Below the threshold, so the finale contributes nothing here in either
  // direction -- while chapter 3 is still mid-beat, which is what makes this a
  // real reading rather than a comparison of two empty lists.
  const at = FINALE_BEAT[0] - 0.02;

  await scrollHeroTo(page, 0);
  const docked = await partOffsets(page);

  await scrollHeroTo(page, at);
  const downward = awayFrom(docked, await partOffsets(page));

  await scrollHeroTo(page, 1);
  await scrollHeroTo(page, at);
  const upward = awayFrom(docked, await partOffsets(page));

  expect(upward, `the scene at p=${at.toFixed(2)} depends on which way you got there`).toEqual(
    downward,
  );
  expect(
    upward.length,
    "every part is still in the air below the finale's re-dock threshold",
  ).toBeLessThan(Object.keys(docked).length);
});

/**
 * The callouts (P13.S3) — the narrator the audit's first finding asked for.
 *
 * These assert the *rendered* result rather than the geometry, because the
 * geometry is already unit-tested and the failure this catches is the gap
 * between the two: the callout layer first shipped as a sibling of the canvas
 * frame, so its percentages resolved against the stage's 814x560 box instead of
 * the frame's 749 square and every plate sat up to 40px from the part it named.
 * Every unit test passed. It looked almost right in a screenshot.
 */
test.describe("part callouts", () => {
  /** The middle of a slot's hold: one part out, one caption showing. */
  // The finale is excluded on purpose: there the stage stops naming one part
  // and shows the catalogue's call to action instead, which is asserted
  // separately below. Several derived samples land inside it, because chapter
  // 3's last slot and the finale overlap by design.
  const holds = () =>
    holdSamples().filter(
      (sample) => sample.away.length > 0 && sample.at > 0 && !inFinale(sample.at),
    );

  test("names exactly one part at a time, and nothing at rest", async ({ page }) => {
    await gotoHero(page);
    const shown = page.locator(".hero-callout[data-shown]");

    await scrollHeroTo(page, 0);
    await expect(shown, "a caption is showing before anything has detached").toHaveCount(0);

    for (const sample of holds()) {
      await scrollHeroTo(page, sample.at);
      await expect(shown, `${sample.what} @ ${sample.at.toFixed(3)}`).toHaveCount(1);
    }
  });

  test("keeps every caption on screen and off the part it names", async ({ page }) => {
    await gotoHero(page);

    for (const sample of holds()) {
      await scrollHeroTo(page, sample.at);
      const boxes = await page.evaluate(() => {
        const plate = document.querySelector(".hero-callout[data-shown]");
        const stage = document.querySelector(".hero-stage");
        if (!plate || !stage) return null;
        const id = plate.getAttribute("data-callout") ?? "";
        const parts = [...document.querySelectorAll(`.hero-stage img[data-part="${id}"]`)].map(
          (sprite) => sprite.getBoundingClientRect(),
        );
        return {
          plate: plate.getBoundingClientRect(),
          stage: stage.getBoundingClientRect(),
          parts,
        };
      });
      if (!boxes) throw new Error(`no visible caption at ${sample.at}`);

      const { plate, stage, parts } = boxes;

      // Fully inside the stage on both axes. The caption is positioned in stage
      // space precisely so the camera can never crop it -- the version placed in
      // canvas space was cut in half by chapter 1's push-in.
      expect(
        plate.left,
        `caption off the start edge at ${sample.at.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(stage.left - 1);
      expect(
        plate.right,
        `caption off the end edge at ${sample.at.toFixed(3)}`,
      ).toBeLessThanOrEqual(stage.right + 1);
      expect(
        plate.top,
        `caption above the stage at ${sample.at.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(stage.top - 1);
      expect(
        plate.bottom,
        `caption below the stage at ${sample.at.toFixed(3)}`,
      ).toBeLessThanOrEqual(stage.bottom + 1);

      // And never on top of its own subject: a label covering the thing it
      // names is the one collision that makes the caption worse than nothing.
      for (const part of parts) {
        const overlaps =
          plate.left < part.right &&
          plate.right > part.left &&
          plate.top < part.bottom &&
          plate.bottom > part.top;
        expect(overlaps, `the caption covers ${sample.what} at ${sample.at.toFixed(3)}`).toBe(
          false,
        );
      }
    }
  });

  test("sends every caption to the same place its manifest row does", async ({ page }) => {
    await gotoHero(page);
    // A caption that promised a different destination from the row naming the
    // same part would be two answers to one question.
    const rows = await page
      .locator("#hero nav[aria-label] li.manifest-row")
      .evaluateAll((items) =>
        Object.fromEntries(
          items.map((item) => [
            item.getAttribute("data-part") ?? "",
            item.querySelector("a")?.getAttribute("href") ?? "",
          ]),
        ),
      );

    const captions = await page.locator(".hero-callout").evaluateAll((plates) =>
      plates.map((plate) => ({
        id: plate.getAttribute("data-callout") ?? "",
        href: plate.querySelector("a")?.getAttribute("href") ?? null,
      })),
    );

    expect(captions.length).toBeGreaterThan(9);
    for (const caption of captions) {
      if (caption.id === "windshield") {
        // The one part the catalogue does not sell: a name, and deliberately no
        // link rather than a link to a page that does not exist.
        expect(caption.href, "the windshield caption gained a destination").toBeNull();
        continue;
      }
      expect(caption.href, `${caption.id}'s caption disagrees with its row`).toBe(rows[caption.id]);
    }
  });
});

/**
 * The job card, checked in part by part (P13.S4).
 *
 * The failure this replaces: rows arrived per *chapter*, so all three of
 * chapter 1's appeared the moment the headlights moved and the list claimed
 * three parts had come off while the visitor could see one.
 */
test.describe("the job card", () => {
  const visibleNav = "#hero nav[aria-label]:visible";

  test("checks in one row per part, in the order the parts leave", async ({ page }) => {
    await gotoHero(page);
    await scrollHeroTo(page, 0);

    const counts: number[] = [];
    for (const sample of holdSamples()) {
      await scrollHeroTo(page, sample.at);
      counts.push(await page.locator(`${visibleNav} .manifest-row[data-checked]`).count());
    }

    // Never goes backwards while scrolling forwards, and every part ends up on
    // the card.
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i], `the card un-checked a row at sample ${i}`).toBeGreaterThanOrEqual(
        counts[i - 1]!,
      );
    }
    expect(counts[0], "rows are already checked in before anything moved").toBe(0);
    expect(counts[counts.length - 1], "the card is not full at the end").toBe(9);

    // The point of the step, asserted where it is actually true: every row has
    // its own check-in point.
    //
    // Not "the count never jumps by more than one between samples" -- that was
    // the first version and it failed for a reason that is not a defect. The
    // samples are slot hold midpoints, and between two of them the chapter-2
    // cover and the first part underneath it both legitimately arrive. It was
    // measuring the sampling, not the behaviour.
    const checkIns = await page
      .locator(`${visibleNav} .manifest-row`)
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-check-in")));
    expect(new Set(checkIns).size, "two rows check in on the same beat").toBe(checkIns.length);
  });

  test("counts what is actually on the card", async ({ page }) => {
    await gotoHero(page);
    for (const at of [0, 0.3, 0.55, 0.85]) {
      await scrollHeroTo(page, at);
      const state = await page.evaluate(() => {
        const nav = [...document.querySelectorAll("#hero nav[aria-label]")].find(
          (candidate) => (candidate as HTMLElement).offsetParent !== null,
        )!;
        const counter = nav.querySelector(".manifest-counter")!;
        const shown = [...counter.querySelectorAll("span")].find(
          (span) => getComputedStyle(span).display !== "none",
        );
        return {
          checked: nav.querySelectorAll(".manifest-row[data-checked]").length,
          shown: [...counter.querySelectorAll("span")].filter(
            (span) => getComputedStyle(span).display !== "none",
          ).length,
          text: shown?.getAttribute("data-count"),
        };
      });
      expect(state.shown, `p=${at}: more than one counter value is visible`).toBe(1);
      expect(Number(state.text), `p=${at}: the counter disagrees with the card`).toBe(
        state.checked,
      );
    }
  });

  test("shows a full card and a matching count with JavaScript disabled", async ({ browser }) => {
    // The no-JS contract runs through the counter now too: a complete list under
    // a count of zero would be the same lie in the other direction.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    const nav = page.locator("#hero nav[aria-label]").first();
    await expect(nav.locator(".manifest-row")).toHaveCount(9);

    const shown = await nav
      .locator(".manifest-counter span")
      .evaluateAll((spans) =>
        spans
          .filter((span) => getComputedStyle(span).display !== "none")
          .map((span) => span.getAttribute("data-count")),
      );
    expect(shown).toEqual(["9"]);
    await context.close();
  });
});

/**
 * The finale (P13.S8, reversed at P14.S5) — the exploded catalogue is the
 * RESTING state, not a climax the car recovers from.
 *
 * Gate B said the opposite and this block asserted it. The owner reversed the
 * decision on 2026-09-07 (`fableTasks.md` §0.5); `heroLayout.FINALE_BEAT`
 * carries the reversal in the source so a future reader does not read it as
 * drift.
 */
test.describe("the finale", () => {
  test("puts every part in the air at once, and leaves them there", async ({ page }) => {
    await gotoHero(page);
    await scrollHeroTo(page, 0);
    const docked = await partOffsets(page);

    await scrollHeroTo(page, 0.93);
    const exploded = awayFrom(docked, await partOffsets(page));
    expect(exploded.sort(), "a part stayed on the car through the finale").toEqual(
      Object.keys(docked).sort(),
    );

    // What Gate B's assertion has become. It used to read "the hero ends
    // exploded" as the FAILURE message on an expectation of `[]`; the same
    // position now has to hold the whole catalogue, because the last frame the
    // visitor carries into the rest of the landing is the one that has to say
    // "this is a parts shop". Asserted here as well as in "ends its scroll
    // exploded" for the same reason it was before: it is the half of the finale
    // that is easiest to lose while tuning the other.
    await scrollHeroTo(page, 1);
    expect(
      awayFrom(docked, await partOffsets(page)).sort(),
      "the hero re-docked before un-pinning -- the finale is supposed to hold to the end",
    ).toEqual(Object.keys(docked).sort());
  });

  test("shows one call to action, and only at the finale", async ({ page }) => {
    await gotoHero(page);
    const cta = page.locator(".hero-finale[data-shown]");

    await scrollHeroTo(page, 0.5);
    await expect(cta, "the CTA is showing mid-scroll").toHaveCount(0);

    await scrollHeroTo(page, 0.93);
    await expect(cta).toHaveCount(1);
    await expect(cta.locator("a")).toHaveCount(2);
    await expect(cta.locator("a").first()).toHaveAttribute("href", "/search");

    // The two-accent rule: tokens.css reserves marigold for where money changes
    // hands, and this button is the only place in the hero that spends it. The
    // check is "how many links share the CTA's exact colour", not "how many
    // links have a background" -- the first version asked the looser question
    // and counted ten, because every row in the system index has one too.
    const sharing = await page.evaluate(() => {
      const cta = document.querySelector<HTMLElement>(".hero-finale a");
      if (!cta) return -1;
      const accent = getComputedStyle(cta).backgroundColor;
      return [...document.querySelectorAll<HTMLElement>("#hero a")].filter(
        (link) => getComputedStyle(link).backgroundColor === accent,
      ).length;
    });
    expect(sharing, "the hero spends its one accent colour more than once").toBe(1);
  });
});

/**
 * Hero pacing (P14.S4): the spring, the soft snap and the tour.
 *
 * These are the tests the brief's §3.7 asks for by name -- "scroll-linked work
 * needs at least one test that scrolls to a position and asserts where things
 * ARE". A spring adds a hop to the transform graph, and both of the failure
 * modes recorded there produce a *plausible* picture that is one frame stale.
 * Nothing that checks "it moved" can see that. Only a reading taken at a known
 * position, after the motion has stopped, can.
 */
test.describe("pacing", () => {
  /** Where the hero is now, as a fraction of its own track. */
  const progressOf = (page: Page) =>
    page.evaluate(() => {
      const track = document.querySelector(".hero-track")!;
      const box = track.getBoundingClientRect();
      const top = box.top + window.scrollY;
      return (window.scrollY - top) / (box.height - window.innerHeight);
    });

  test("the track is longer than the viewport it pins, at both widths", async ({ page }) => {
    // 100vh + 96rem on mobile, 100vh + 160rem from `lg` (P14.S4). Asserted as
    // the *travel* rather than as a class string, because the travel is what
    // every fraction in the scene is measured against -- and it is the number
    // the owner feels as "slow and enjoyable".
    for (const [width, height, rem] of [
      [390, 844, 96],
      [1440, 900, 160],
    ] as const) {
      await page.setViewportSize({ width, height });
      await gotoHero(page);
      const travel = await page.evaluate(() => {
        const track = document.querySelector(".hero-track")!;
        return track.getBoundingClientRect().height - window.innerHeight;
      });
      const root = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.documentElement).fontSize),
      );
      expect(travel, `${width}px track travel`).toBeGreaterThan(rem * root - 4);
      expect(travel, `${width}px track travel`).toBeLessThan(rem * root + 4);
    }
  });

  test("a flick plays the story through instead of teleporting", async ({ page }) => {
    await gotoHero(page);
    await scrollHeroTo(page, 0);
    const docked = await partOffsets(page);

    // Jump the whole track in one go, then read TWICE: once immediately, once
    // after the scene has stopped. Without a spring both reads are identical.
    await page.evaluate(() => {
      const track = document.querySelector(".hero-track")!;
      const box = track.getBoundingClientRect();
      window.scrollTo(0, box.top + window.scrollY + (box.height - window.innerHeight) * 0.51);
    });
    const immediately = await partOffsets(page);
    await settleHero(page);
    const settled = await partOffsets(page);

    // Mid-flight the engine chapter has not arrived...
    expect(awayFrom(docked, immediately), "the scene teleported -- no smoothing").not.toEqual(
      awayFrom(docked, settled),
    );
    // ...and when it lands, it lands exactly where a scrubbed scroll would put
    // it: chapter 2's middle slot out, under an open hood, everything else on
    // the car. This is the end-state assertion. If the spring had put any input
    // of the finale blend a frame behind, this is where it would show.
    expect(awayFrom(docked, settled).sort()).toEqual(["hood", "piston"].sort());
  });

  test("the story still ends fully parked once the spring has settled", async ({ page }) => {
    // The ending, re-asserted through the spring's hop. `restDelta` is the
    // reason this is not vacuous: motion's default would let the spring call
    // itself finished 0.005 of a track short, which at 160rem is 12.8px of
    // scroll -- and "the car finished ~10px of scroll short of docked" is
    // verbatim the symptom the last transform-graph bug produced.
    //
    // The end state it checks flipped at P14.S5 (the owner's Gate B reversal),
    // and the flip makes this reading *stricter* rather than weaker: the
    // finale's mix is flat at 1 across the last tenth of the track, so a spring
    // that stopped short would land on an identical picture and hide itself.
    // What catches it now is `parkedAt`, which reads where the parts ARE rather
    // than only whether they moved -- the brief's §3.7 rule, applied to the new
    // ending.
    await gotoHero(page);
    await scrollHeroTo(page, 0);
    const docked = await partOffsets(page);

    const parkedAt = async (p: number) => {
      await scrollHeroTo(page, p);
      return partOffsets(page);
    };

    const held = await parkedAt(FINALE_BEAT[1]);
    const settled = await parkedAt(1);

    expect(awayFrom(docked, settled).sort()).toEqual(Object.keys(docked).sort());
    // And parked in the SAME place: the hold is flat, so any drift between the
    // start of the hold and the end of the track past the suspended bob is the
    // spring (or a stale transform input) leaking into a beat that is meant to
    // be still.
    for (const id of Object.keys(settled)) {
      expect(
        Math.hypot(settled[id]!.x - held[id]!.x, settled[id]!.y - held[id]!.y),
        `${id} drifted across the finale's flat hold`,
      ).toBeLessThan(DOCKED_TOLERANCE);
    }
  });

  test("a gesture that stops near a station settles onto it", async ({ page }) => {
    await gotoHero(page);
    // Park just inside the engine station's band, then hand the last few pixels
    // to a real wheel gesture: the snap is armed by input, never by a scripted
    // scroll, so a `scrollTo` alone must NOT move the page.
    await scrollHeroTo(page, 0.51 - 0.03);
    const before = await progressOf(page);
    await page.waitForTimeout(600);
    expect(await progressOf(page), "a scripted scroll armed the snap").toBeCloseTo(before, 3);

    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(1500);
    expect(await progressOf(page), "the scroll did not settle onto the station").toBeCloseTo(
      0.51,
      2,
    );
  });

  test("a gesture that stops between stations is left alone", async ({ page }) => {
    await gotoHero(page);
    // The rest beat between chapters 1 and 2 -- 0.35, which is 0.17 from the
    // nearest dwell point and therefore far outside the band. Stopping here is
    // a decision, and the page must not overrule it.
    await scrollHeroTo(page, 0.35);
    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 30);
    await page.waitForTimeout(1500);
    const now = await progressOf(page);
    expect(now, "the page pulled the visitor out of a rest beat").toBeGreaterThan(0.3);
    expect(now).toBeLessThan(0.45);
  });

  test("the tour plays itself and yields to the first real input", async ({ page }) => {
    await gotoHero(page);
    await scrollHeroTo(page, 0);
    const tour = page.locator("#hero button", { hasText: "نمایش خودکار" });
    await expect(tour).toHaveCount(1);

    await tour.click();
    // A leg is 2.4s plus a 0.8s hold, so by 3s the first station has arrived
    // and the second leg has not gone far.
    await page.waitForTimeout(3000);
    const arrived = await progressOf(page);
    expect(arrived, "the tour did not reach the first station").toBeGreaterThan(0.15);

    // Any real input stops it, and it does not resume.
    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 10);
    await page.waitForTimeout(400);
    const stopped = await progressOf(page);
    await page.waitForTimeout(1500);
    expect(await progressOf(page), "the tour resumed after being interrupted").toBeCloseTo(
      stopped,
      2,
    );
    await expect(tour, "the control did not return to its start state").toHaveCount(1);
  });

  /** The tour's own controls, by the copy `fa.json` gives them. */
  const tourButton = (page: Page) => page.locator("#hero button", { hasText: "نمایش خودکار" });
  const stopButton = (page: Page) => page.locator("#hero button", { hasText: "توقف نمایش" });

  /**
   * The three window listeners a running tour owns, counted from outside it.
   *
   * There is no way to enumerate listeners from a page, so this wraps
   * `window.addEventListener` / `removeEventListener` before the app loads and
   * keeps a running net per event type. Every assertion below is a *delta*
   * against a baseline taken immediately before the tour starts, so anything
   * the page attached at mount cancels out.
   */
  async function countWindowListeners(page: Page) {
    return page.evaluate(() => ({
      ...((window as Window & { __listenerNet?: Record<string, number> }).__listenerNet ?? {}),
    }));
  }

  async function instrumentWindowListeners(page: Page) {
    await page.addInitScript(() => {
      const net: Record<string, number> = {};
      (window as Window & { __listenerNet?: Record<string, number> }).__listenerNet = net;
      type Listener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions | EventListenerOptions,
      ) => void;
      const add = window.addEventListener.bind(window) as Listener;
      const remove = window.removeEventListener.bind(window) as Listener;
      const wrap =
        (inner: Listener, delta: number): Listener =>
        (type, listener, options) => {
          net[type] = (net[type] ?? 0) + delta;
          inner(type, listener, options);
        };
      window.addEventListener = wrap(add, 1) as unknown as typeof window.addEventListener;
      window.removeEventListener = wrap(remove, -1) as unknown as typeof window.removeEventListener;
    });
  }

  test("stopping the tour with the button takes its listeners back", async ({ page }) => {
    // The leak this pins was invisible from the page: the stop button cancelled
    // the animation frame and flipped the label, but the teardown lived inside
    // the gesture handler, so the three window listeners stayed attached until
    // some later stray wheel, touch or keypress happened to run them. Nothing
    // on screen showed it, and a second tour then attached three more.
    await instrumentWindowListeners(page);
    await gotoHero(page);
    await scrollHeroTo(page, 0);

    const types = ["wheel", "touchstart", "keydown"] as const;
    const before = await countWindowListeners(page);

    await tourButton(page).click();
    // They go on inside the first animation frame, deliberately -- see the
    // comment on `startTour`.
    await page.waitForTimeout(300);
    const during = await countWindowListeners(page);
    for (const type of types) {
      expect((during[type] ?? 0) - (before[type] ?? 0), `${type} while touring`).toBe(1);
    }

    await stopButton(page).click({ force: true });
    await page.waitForTimeout(300);
    const after = await countWindowListeners(page);
    for (const type of types) {
      expect((after[type] ?? 0) - (before[type] ?? 0), `${type} after the stop button`).toBe(0);
    }
    await expect(tourButton(page), "the control did not return to its start state").toHaveCount(1);
  });

  test("stopping the tour with the button hands soft snapping back", async ({ page }) => {
    await gotoHero(page);
    await scrollHeroTo(page, 0);
    await tourButton(page).click();
    await page.waitForTimeout(1200);
    // `dispatchEvent` for the same reason as the station buttons below: the
    // press has to land mid-leg, and a real click cannot.
    await stopButton(page).dispatchEvent("click");
    await expect(tourButton(page)).toHaveCount(1);

    // A tour suppresses snapping for its whole length -- four legs plus the
    // spring's settle, 14.8s. Stopping it early has to give that back, or the
    // hero ignores the snapper for a quarter of a minute after the visitor
    // asked the tour to stop.
    //
    // The gesture that arms the snapper below is a bare `touchmove`, not a
    // wheel, and that choice is the test. `wheel` is one of the three events a
    // running tour listens for, so a real wheel here would have *repaired* the
    // leak it is meant to expose -- the stale listener would fire, release the
    // hold, and the snap would go through against the bug. `touchmove` is what
    // arms the provider's snapper and is not an event the tour ever listened
    // for, so the only thing that can have released the hold is the button.
    await page.evaluate(() => {
      const track = document.querySelector(".hero-track")!;
      const box = track.getBoundingClientRect();
      const top = box.top + window.scrollY;
      const travel = box.height - window.innerHeight;
      window.dispatchEvent(new Event("touchmove"));
      // Just inside the engine station's band. A scripted scroll never arms the
      // snapper by itself, which is why the gesture above is needed at all.
      window.scrollTo(0, top + travel * (0.51 - 0.03));
    });
    await page.waitForTimeout(2500);
    expect(
      await progressOf(page),
      "the stopped tour left snapping suppressed behind it",
    ).toBeCloseTo(0.51, 2);
  });

  /**
   * The nine slot peaks the station buttons walk, derived exactly as
   * `StageSteps` derives them.
   */
  const slotStops = ([1, 2, 3] as const).flatMap((chapter) =>
    CHAPTER_SEQUENCE[chapter].map((_, slot) => {
      const beat = beatFor(chapter, slot);
      return (beat[1]! + beat[2]!) / 2;
    }),
  );

  // The slot peaks either side of the first station (0.18), and a ceiling that
  // only a tour still marching towards the second one (0.51) could cross.
  for (const [label, button, expected, ceiling] of [
    ["next", "قدم بعدی", 0.2728, 0.4],
    ["previous", "قدم قبلی", 0.0872, 0.15],
  ] as const) {
    test(`${label} during a tour wins, instead of being overwritten`, async ({ page }) => {
      await gotoHero(page);
      await scrollHeroTo(page, 0);
      await tourButton(page).click();

      // A leg is 2.4s plus a 0.8s hold, so by 3.3s the tour is parked on the
      // first station (0.18) and has just set off for the second (0.51).
      await page.waitForTimeout(3300);
      expect(await progressOf(page), "the tour did not reach the first station").toBeGreaterThan(
        0.15,
      );

      // A mouse click is not one of the events the tour listens for, so before
      // the fix this scroll was simply overwritten by the tour's own frame loop
      // and the press vanished. Sitting on 0.18, the adjacent slot peaks are
      // 0.2728 forwards and 0.0872 back -- both a long way from the 0.51 the
      // tour was heading for, which is what makes the ceiling below decisive.
      //
      // Dispatched rather than clicked, because a real click cannot land while
      // the page is scrolling under it. Playwright first waits for the element
      // to be *stable* -- and the captions above these buttons change height as
      // parts undock, so the row only holds still during a station's 800ms
      // pause; left to itself the click waited six seconds for the third hold
      // and then tested nothing, because a parked tour cannot overwrite
      // anything. `force` does not help either: it still scrolls the element
      // into view, the tour scrolls the page back on the next frame, and the
      // click point lands outside the viewport. The press this test is about is
      // the one that arrives mid-leg, so it is delivered directly.
      await page.locator("#hero button", { hasText: button }).dispatchEvent("click");
      await page.waitForTimeout(2200);
      const landed = await progressOf(page);
      expect(landed, `${label} did not reach its slot peak`).toBeCloseTo(expected, 2);
      expect(landed, `the tour carried on past ${label}`).toBeLessThan(ceiling);
      expect(
        slotStops.some((stop) => Math.abs(stop - landed) < 0.01),
        `${label} did not land on a slot peak the layout declares`,
      ).toBe(true);

      // ...and it stays there: the tour is over, not merely one frame behind.
      await page.waitForTimeout(1500);
      expect(await progressOf(page), "the tour resumed after a station button").toBeCloseTo(
        landed,
        2,
      );
    });
  }

  test("activating the tour control stops it instead of restarting it", async ({ page }) => {
    // The guard here is subtle and load-bearing. A tour cancels on any real
    // input, and the events that *activate a button* are real input: Space
    // fires `keydown` before the click it produces, and a tap fires
    // `touchstart` before it. Without the tour button's exemption from its own
    // interrupt, the first event stops the tour and the click that follows
    // finds it stopped and starts a second one -- the visitor presses "stop"
    // and it plays again.
    //
    // Both orderings are exercised, because they are two different events with
    // one shared failure. The keyboard one is entirely real input; the touch
    // one is dispatched in the browser's own order, since Playwright's `tap`
    // sends no click after the touch and so cannot reach the bug at all.
    await gotoHero(page);
    await scrollHeroTo(page, 0);

    await tourButton(page).focus();
    await page.keyboard.press("Space");
    await expect(stopButton(page), "Space did not start the tour").toHaveCount(1);
    await page.waitForTimeout(1200);
    await page.keyboard.press("Space");
    // The restart, if it happened, would be synchronous with the click -- and a
    // tour runs 12.8s, so the control would read "stop" for the next twelve
    // seconds. The *label* is what discriminates here, not the scroll position:
    // a second tour's first leg heads for station 1, which is where a tour
    // stopped 1.2s in is already sitting, so the two are indistinguishable by
    // position for seconds. (The small drift that does follow is the soft snap
    // being handed back, which is the other half of this step working.)
    await expect(tourButton(page), "Space did not stop the tour").toHaveCount(1);
    await page.waitForTimeout(2000);
    await expect(
      stopButton(page),
      "Space cancelled the tour and immediately started another",
    ).toHaveCount(0);

    await tourButton(page).click();
    await page.waitForTimeout(1200);
    // `touchstart` on the button, then the click it would produce: the real
    // sequence, in the real order, one task apart.
    await stopButton(page).dispatchEvent("touchstart");
    await page.waitForTimeout(50);
    await stopButton(page).dispatchEvent("click");
    await expect(tourButton(page), "the tap did not stop the tour").toHaveCount(1);
    await page.waitForTimeout(2000);
    await expect(
      stopButton(page),
      "the tap cancelled the tour and immediately started another",
    ).toHaveCount(0);
  });

  test("the station is announced once per scene, not once per frame", async ({ page }) => {
    await gotoHero(page);
    const live = page.locator("#hero [aria-live='polite']");
    await expect(live).toHaveCount(1);
    // Empty on load: a live region populated at mount announces itself, and a
    // visitor who has not scrolled has not asked to be told anything.
    await expect(live).toHaveText("");

    await scrollHeroTo(page, 0.18);
    await expect(live).toContainText("۱");
    await scrollHeroTo(page, 0.51);
    await expect(live).toContainText("۲");
    await scrollHeroTo(page, 0.93);
    await expect(live).toContainText("۴");
  });
});

/**
 * The arrival sweep, and the entry it used to be wasted on (P14.S9).
 *
 * "One slow pass of light across the body as the hero comes in" was an
 * unconditional CSS animation on load. That is right for the only entry anyone
 * had checked -- the hero is the first paint -- and wrong for a deep link past
 * it: the browser jumps a screen and a half down before the animation's 300ms
 * delay is up, the light sweeps a car nobody is looking at, and a one-shot
 * animation does not come back. `StageNarration` now arms it from an
 * IntersectionObserver on the stage.
 */
test.describe("the arrival sweep", () => {
  test("is armed when the hero is the first paint", async ({ page }) => {
    await gotoHero(page);
    await expect(page.locator(".hero-sweep[data-arrive]")).toHaveCount(1);
  });

  test("is not spent by a deep link past the hero, and still arrives on the way back", async ({
    page,
  }) => {
    await page.goto("/#find-my-part");
    await page.locator("#find-my-part").waitFor();
    // Long enough that the old unconditional animation would have run and
    // finished; the assertion is about the attribute, not the timing.
    await page.waitForTimeout(1500);

    const state = await page.evaluate(() => {
      const stage = document.querySelector("#hero .hero-stage");
      const box = stage?.getBoundingClientRect();
      return {
        armed: document.querySelectorAll(".hero-sweep[data-arrive]").length,
        // Named so a failure says WHY: if the deep link left the stage on
        // screen, arming it was correct and the test is wrong, not the code.
        stageOnScreen: box ? box.bottom > 0 && box.top < window.innerHeight : null,
      };
    });
    expect(state).toEqual({ armed: 0, stageOnScreen: false });

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".hero-sweep[data-arrive]")).toHaveCount(1);
  });
});
