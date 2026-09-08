import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * How long a server-rendered, API-backed section gets to appear.
 *
 * This is a precondition for the assertions below, never the assertion itself.
 * The suite runs ~10 workers against a single dev API, so a section's first
 * paint is load-dependent rather than fixed -- waiting longer costs nothing on
 * a quiet run and stops a busy one failing for a reason that has nothing to do
 * with the code under test.
 */
const SECTION_RENDER = 45_000;

/**
 * Per-section regressions for the Phase 9 rebuild, added as each beat lands.
 * S16 folds these into the full screenshot + link sweep.
 */

const MOBILE = { width: 390, height: 900 };
const NARROW = { width: 360, height: 900 };

/**
 * P12.S10, recording defect 4. Verification codes are 36-45 characters
 * (`VER-SKU-ENGINE-CYLINDER-HEAD-GASKET-PRIDE-111`). As plain text inside
 * Persian copy they wrapped across lines, and a Latin run in an RTL paragraph
 * can be *repositioned* by the bidi algorithm -- every character present, in the
 * wrong visual order, which is the worst possible failure for a value someone
 * is asked to compare against a hologram.
 */
/**
 * P12.S11, verifying defect 7 rather than assuming it: a reported black tail
 * of scrollable nothing under the footer.
 *
 * The document ends exactly at the footer's bottom edge at every width -- there
 * is no void to close. What a recording can still show past it is the browser's
 * over-scroll, which paints the canvas colour (`body`'s background, since
 * `html` is transparent), and in the dark theme that is very dark by design.
 * This asserts the thing that would be a real bug -- scrollable space, or
 * something sticking out below the footer -- and does not chase a colour that
 * is correct.
 */
/**
 * P12.S12, recording defect 6. The wall was a thin line of 20px grey text
 * drifting through the page -- it read as a caption, not as a wall, and the
 * missing logos (fableTasks2 §5.6) left nothing carrying the weight.
 */
test.describe("brand wall (defect 6)", () => {
  for (const viewport of [NARROW, MOBILE, { width: 1440, height: 900 }]) {
    test(`sets every brand whole and on one line at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.locator("#hero").waitFor();
      const wall = page.locator("#brand-wall");
      await expect(wall).toHaveCount(1, { timeout: SECTION_RENDER });

      const info = await wall.evaluate((el) => {
        const links = [...el.querySelectorAll("a")];
        const band = el.querySelector("a")!.closest("div.border-y");
        const bandStyle = band ? getComputedStyle(band) : null;
        return {
          fontSize: parseFloat(getComputedStyle(links[0]!).fontSize),
          borderTop: bandStyle?.borderTopWidth ?? "0px",
          borderBottom: bandStyle?.borderBottomWidth ?? "0px",
          wrapped: links
            .map((link) => {
              const style = getComputedStyle(link);
              const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
              return link.getBoundingClientRect().height > lineHeight * 1.6
                ? link.textContent
                : null;
            })
            .filter(Boolean),
          // Anything clipped to nothing would be an orphan of a different kind.
          empty: links.filter((link) => !link.textContent?.trim()).length,
        };
      });

      // Ruled top and bottom -- what makes it a band rather than loose text.
      expect(parseFloat(info.borderTop), "no rule above the wall").toBeGreaterThan(0);
      expect(parseFloat(info.borderBottom), "no rule below the wall").toBeGreaterThan(0);
      // Larger than the caption it used to be. h3 was 20px.
      expect(info.fontSize, "the wall is still set at caption weight").toBeGreaterThan(24);
      // No orphans: a proper noun broken over two lines inside a scrolling
      // track. «سایپا یدک» is one name, not two words that may be split.
      expect(info.wrapped, `these brand names wrapped: ${info.wrapped.join(", ")}`).toEqual([]);
      expect(info.empty, "a brand rendered with no name").toBe(0);
    });
  }
});

test.describe("the page ends at the footer (defect 7)", () => {
  for (const viewport of [NARROW, MOBILE, { width: 1440, height: 900 }]) {
    test(`has nothing scrollable past the footer at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.locator("#hero").waitFor();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const info = await page.evaluate(() => {
        const footer = document.querySelector("footer");
        if (!footer) return null;
        const rect = footer.getBoundingClientRect();

        /**
         * The floor of the page, which below `md` is NOT the viewport's bottom.
         *
         * `MobileNav` is a fixed bar over the last ~59px of the screen, and
         * P14.S6 moved the `pb-16` that reserves room for it onto the layout's
         * OUTER wrapper -- the footer was sitting under the bar with its
         * copyright line covered. So at 360 and 390 the document deliberately
         * ends one bar's height above the viewport, and measuring against
         * `innerHeight` reported that reserve as 63.86px of dead space. It is
         * not dead: the bar is standing on it.
         *
         * Above `md` the bar is `display: none` and this is the viewport bottom
         * again, which is what the 1440 case has always asserted.
         */
        const bar = document.querySelector("[data-bottom-nav]");
        const barVisible = bar ? getComputedStyle(bar).display !== "none" : false;
        const floor = barVisible ? bar!.getBoundingClientRect().top : window.innerHeight;

        return {
          gap: floor - rect.bottom,
          // The reserve itself: room kept for the bar that the bar does not
          // occupy is real dead space, just a smaller kind.
          overReserve: barVisible ? window.innerHeight - bar!.getBoundingClientRect().top : null,
          // What renders past the END OF THE PAGE, which is the floor above and
          // not the footer's own edge -- the strip between the two is the bar's
          // reserve and is already measured by `gap`.
          //
          // Three things sit below the footer legitimately and are not dead
          // space, so each is named rather than tolerated by a loose threshold:
          //
          // - the fixed bottom bar and its contents: being below the page is
          //   what "fixed to the bottom of the viewport" means;
          // - anything else `position: fixed` -- the toast region, `bottom-4`
          //   in the corner -- which is viewport chrome, not page flow;
          // - the footer's own ancestors, whose `pb-16` IS the reserve. A
          //   wrapper's padding extending past its last child is the mechanism
          //   under test, not a violation of it.
          //
          // Zero-area elements are excluded because they cannot be seen:
          // `<next-route-announcer>` is Next's own sr-only live region and
          // trails the body on every page.
          past: [...document.querySelectorAll("body *")]
            .filter((el) => {
              if (el === bar || bar?.contains(el)) return false;
              if (el.contains(footer)) return false;
              if (getComputedStyle(el).position === "fixed") return false;
              const box = el.getBoundingClientRect();
              return box.width > 0 && box.height > 0 && box.bottom > floor + 1;
            })
            .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`)
            .slice(0, 5),
        };
      });

      expect(info, "the page has no footer").not.toBeNull();
      // Scrolled to the very bottom, the footer's last pixel is the last pixel
      // of the page -- the viewport's, or, below `md`, the top edge of the
      // fixed bottom bar. A NEGATIVE gap is the P14.S6 defect: the footer
      // running on under the bar with its copyright line covered.
      expect(info!.gap, `the footer runs under the bottom bar by ${-info!.gap}px`).toBeGreaterThan(
        -1.5,
      );

      if (info!.overReserve === null) {
        // No bar (>= md): the old assertion, unchanged. Within a pixel, because
        // a fractional layout height rounds either way -- and because
        // `Math.round` can hand back `-0`, which `toBe(0)` rejects.
        expect(info!.gap, `gap below the footer: ${info!.gap}`).toBeLessThan(1.5);
      } else {
        // With the bar, the page reserves room for it with `pb-16` (64px), and
        // the bar measures ~59: the reserve is spent, minus whatever a whole
        // spacing step overshoots by. The scale is REPLACED, so 64 is the
        // smallest step that clears the bar at all -- 48 would put the footer
        // back underneath it. What must stay true is that the leftover is a
        // rounding artefact rather than a band: under one spacing step. The
        // 63.86px this reported before the bar was taken into account -- a
        // whole reserve of nothing -- fails this.
        expect(
          info!.gap,
          `dead space between the footer and the bottom bar: ${info!.gap}px ` +
            `(bar is ${info!.overReserve}px tall)`,
        ).toBeLessThan(8);
      }
      expect(info!.past, `these render below the footer: ${info!.past.join(", ")}`).toEqual([]);
    });
  }
});

test.describe("evidence codes (defect 4)", () => {
  test("stamps every code on one line, isolated from the RTL text around it", async ({ page }) => {
    await page.goto("/");
    await page.locator("#authenticity").waitFor({ timeout: SECTION_RENDER });
    const codes = page.locator(".evidence-code");
    const count = await codes.count();
    expect(count, "no evidence code rendered").toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const code = codes.nth(index);
      const info = await code.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          height: el.getBoundingClientRect().height,
          lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
          direction: style.direction,
          bidi: style.unicodeBidi,
          variant: style.fontVariantNumeric,
          family: style.fontFamily,
          title: el.getAttribute("title"),
          text: el.textContent,
        };
      });

      // One line: a wrapped 45-character code was two or three.
      expect(info.height, `code ${index} wrapped`).toBeLessThan(info.lineHeight * 1.6);
      // `dir` alone sets direction inside the run; the isolate is what stops the
      // surrounding paragraph deciding where the run is placed.
      expect(info.bidi, `code ${index} is not bidi-isolated`).toContain("isolate");
      expect(info.variant, `code ${index} digits are not tabular`).toContain("tabular-nums");
      expect(info.family.toLowerCase(), `code ${index} is not mono`).toMatch(/mono/);
    }
  });

  /**
   * The rest of defect 4's contract, on the elements it was written for.
   *
   * The block above used to carry these three assertions too, and it had been
   * failing since the hero callouts shipped -- for a good reason that was not
   * the one it reported. `.evidence-code` started as `EvidenceCode`'s own class
   * and has since been adopted by three other call sites that stamp a short
   * identifier in a mono face: the hero's `PartCallout` plate, the system tiles
   * in `#find-my-part` and the model years in `#shop-by-vehicle`. Those share
   * the *typographic* contract -- one line, isolated, mono, tabular -- and
   * cannot meet the rest of it: `SYS-02` is six characters, not the ">10" a
   * clipped verification code has to keep in the DOM, and a Persian-digit year
   * inside an RTL link is correctly `rtl`, not `ltr`.
   *
   * So the class-wide assertions stay class-wide (and P14.S9 moved
   * `tabular-nums` onto the class to make that true rather than to make the
   * test pass), and the assertions that belong to a 45-character verification
   * code are scoped to it. `[title]` is the discriminator because `title` is
   * the thing only a truncated code needs.
   */
  test("keeps a truncated verification code whole in the DOM", async ({ page }) => {
    await page.goto("/");
    await page.locator("#authenticity").waitFor({ timeout: SECTION_RENDER });
    const codes = page.locator("#authenticity .evidence-code[title]");
    const count = await codes.count();
    expect(count, "no verification code rendered").toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const info = await codes.nth(index).evaluate((el) => ({
        direction: getComputedStyle(el).direction,
        title: el.getAttribute("title"),
        text: el.textContent,
      }));

      expect(info.direction, `code ${index} direction`).toBe("ltr");
      // Truncation is visual only. The DOM keeps the whole code, so a screen
      // reader reads it and selecting it copies it; `title` shows it on hover.
      expect(info.title, `code ${index} lost its full value`).toBe(info.text);
      expect(info.text!.length, `code ${index} was shortened in the DOM`).toBeGreaterThan(10);
    }
  });
});

test.describe("best sellers rail (audit item 2)", () => {
  for (const viewport of [NARROW, MOBILE]) {
    test(`cards keep a definite width at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.locator("#hero").waitFor();

      const cards = page.locator("#best-sellers li");
      const count = await cards.count();
      test.skip(count === 0, "no featured products seeded");

      for (let index = 0; index < count; index += 1) {
        const box = await cards.nth(index).boundingBox();
        expect(box, `card ${index} has no box`).not.toBeNull();
        // 256px is --rail-card. Before the fix the first card measured 992px:
        // `w-64` generates no CSS against this project's short spacing scale,
        // so the card fell back to its content width -- the product image at
        // its intrinsic size.
        expect(box!.width, `card ${index} width`).toBeCloseTo(256, -1);
        expect(box!.width, `card ${index} overflows the viewport`).toBeLessThan(viewport.width);
      }
    });
  }

  /**
   * P12.S9, recording defect 3. A part with no photograph used to render as a
   * dashed box reading «بدون تصویر»; four of them in a row read as a broken
   * grid. It is a technical plate now -- the system's line drawing, its SYS
   * code and its Persian name on ruled paper.
   */
  test("draws a technical plate for a part with no photograph", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();
    const plates = page.locator("#best-sellers .technical-plate");
    test.skip((await plates.count()) === 0, "every featured product has a photo");

    const first = plates.first();
    // A drawing, not a photograph: the glyph is inline SVG, never an <img>.
    await expect(first.locator("svg")).toHaveCount(1);
    await expect(first.locator("img")).toHaveCount(0);
    // The code is real, resolved from the product's own category by the API.
    await expect(first).toContainText(/SYS-\d\d/);
    // And it says a photo is missing, rather than letting the code imply the
    // part was shown -- P9.S17's Label-in-Name lesson, applied to role="img".
    await expect(first).toHaveAttribute("aria-label", /بدون تصویر/);
  });

  test("leads the rail with photographed parts when there are any", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();
    const cards = page.locator("#best-sellers li");
    const count = await cards.count();
    test.skip(count === 0, "no featured products seeded");

    const hasPhoto: boolean[] = [];
    for (let index = 0; index < count; index += 1) {
      hasPhoto.push((await cards.nth(index).locator("img").count()) > 0);
    }
    // Not a filter -- an unphotographed part still ships, it just does not open
    // the rail while photographed ones are waiting behind it. Expressed as
    // "never a photo after a plate", which is what sorting by that key means
    // and which holds trivially when every card is one kind or the other.
    const firstPlate = hasPhoto.indexOf(false);
    if (firstPlate !== -1) {
      expect(
        hasPhoto.slice(firstPlate).some(Boolean),
        `photo after a plate: ${hasPhoto.join(",")}`,
      ).toBe(false);
    }
  });

  test("the rail scrolls sideways instead of growing the page", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const section = page.locator("#best-sellers");
    test.skip((await section.count()) === 0, "no featured products seeded");

    // The section is deferred by P15.S2's `content-visibility: auto`, so an
    // unscrolled `boundingBox()` returns its `contain-intrinsic-size`
    // placeholder rather than its laid-out height -- which would make this
    // assertion pass or fail on a CSS estimate instead of on the rail. Scroll
    // it into view first so the number under test is the real one.
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("h2")).toBeVisible();

    const height = (await section.boundingBox())!.height;
    // The audit measured 1,848px here, caused by cards stacking at their
    // intrinsic image width rather than sitting in a scrollable rail. It now
    // measures ~720: heading, subtitle, and one 256px card row. The bound is
    // deliberately loose enough to survive copy reflow and tight enough that
    // the old failure -- cards resolving to their image width -- cannot pass.
    expect(height).toBeLessThan(900);
  });
});

test.describe("trust strip", () => {
  test("every claim names a process, not just a promise", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const items = page.locator("#trust-strip li");
    await expect(items).toHaveCount(4);

    for (let index = 0; index < 4; index += 1) {
      const paragraphs = items.nth(index).locator("p");
      await expect(paragraphs).toHaveCount(2);
      const detail = (await paragraphs.nth(1).textContent())?.trim() ?? "";
      expect(detail.length, `claim ${index} has no supporting detail`).toBeGreaterThan(20);
    }
  });
});

// One test per viewport rather than a loop: three full page loads in one
// test outgrew the 30s budget once the hero gained its video stage, and a
// loop reports "the page overflows" without saying where.
for (const viewport of [NARROW, MOBILE, { width: 1440, height: 900 }]) {
  test(`the landing page never scrolls sideways at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator("#hero").waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test.describe("shop-by-system absorbed into the hero (S9)", () => {
  test("the standalone grid is gone but its landmark survives", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    await expect(page.locator("section#shop-by-system")).toHaveCount(0);
    // The heading stays as an sr-only landmark on the hero's index rail, so
    // deleting the section did not also delete the page's semantics.
    const heading = page.locator("#shop-by-system-heading");
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveText(/\S/);
  });

  test("the hero rail carries all ten systems, once each", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    // Scoped to the index's own list, not to every /c/ link in the hero. The
    // parts manifest (P12.S4/S5) links into categories too, and it renders
    // twice -- the desktop panel and the mobile chip rail, one hidden by CSS --
    // so `#hero a[href^=/c/]` matches 28 anchors with intended duplicates and
    // has stopped being a count of the systems.
    const heroHrefs = await page
      .locator("ul[aria-labelledby='shop-by-system-heading'] a[href^='/c/']")
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
    expect(new Set(heroHrefs).size).toBe(heroHrefs.length);
    expect(heroHrefs).toHaveLength(10);

    // What S9 removed was a second enumeration of these same ten systems
    // under the same system names. The symptom finder still lists ten links
    // into the same destinations under symptom phrases instead -- a separate
    // finding, recorded for S12; not something this assertion should paper
    // over by counting loosely.
    await expect(page.locator("main section#shop-by-system")).toHaveCount(0);
  });
});

test.describe("shop by vehicle (audit item 1)", () => {
  test("every rendered vehicle link resolves a real generation page", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    // Wait rather than skip. The section fetches its tree server-side and
    // degrades to null when the API is slow or down, so a bare count check
    // turns a transient into a silent "nothing to test" -- observed once in a
    // loaded run. The tree IS seeded, so absence here is a failure worth
    // seeing.
    await expect(page.locator("#shop-by-vehicle")).toHaveCount(1, { timeout: SECTION_RENDER });
    const links = page.locator("#shop-by-vehicle a[href^='/vehicle/']");
    const hrefs = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
    );

    for (const href of hrefs) {
      // /vehicle/[make]/[model] is not a route -- the audit found every such
      // link returning 404. Four segments, ending in a generation year.
      expect(href, "link must carry a generation segment").toMatch(
        /^\/vehicle\/[a-z0-9-]+\/[a-z0-9-]+\/\d{4}$/,
      );
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });

  test("a model with no generation renders as text, never as a broken link", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const section = page.locator("#shop-by-vehicle");
    await expect(section).toHaveCount(1, { timeout: SECTION_RENDER });

    // Every list item is either a link with a generation or plain text. What
    // must never exist is a link that stops at the model.
    const modelOnlyLinks = await section
      .locator("a[href^='/vehicle/']")
      .evaluateAll((anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter((href) => href.split("/").filter(Boolean).length < 4),
      );
    expect(modelOnlyLinks).toEqual([]);
  });
});

test.describe("authenticity story stage (S11)", () => {
  test("mobile fetches zero video bytes", async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/landing/video/") && request.url().endsWith(".mp4")) {
        videoRequests.push(request.url());
      }
    });

    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.locator("#hero").waitFor();

    await expect(page.locator("#authenticity")).toHaveCount(1, { timeout: SECTION_RENDER });
    // The video mounts on hydration, not in the SSR HTML, so an absence
    // assertion has to give hydration time to prove itself -- otherwise this
    // passes for the wrong reason on every run.
    await page.waitForTimeout(2_000);
    // fableTasks D3: below 1024px the slot renders its poster and nothing else.
    expect(videoRequests).toEqual([]);
    await expect(page.locator("#authenticity video")).toHaveCount(0);
  });

  test("desktop stages the beat with the clip, muted and looping", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const video = page.locator("#authenticity video");
    await expect(video).toHaveCount(1, { timeout: SECTION_RENDER });
    // `muted` is a DOM property here, not an attribute -- React never emits
    // the attribute, so asserting on the attribute would be asserting on a
    // React implementation detail rather than on whether the page is silent.
    expect(await video.evaluate((node) => (node as HTMLVideoElement).muted)).toBe(true);
    await expect(video).toHaveAttribute("loop", /.*/);
    await expect(video).toHaveAttribute("playsinline", /.*/);
    // The clips ship with no audio track at all (P9.S3), which is the real
    // guarantee behind "nothing autoplays with sound".
    expect(
      await video.evaluate((node) => {
        const media = node as HTMLVideoElement & {
          mozHasAudio?: boolean;
          webkitAudioDecodedByteCount?: number;
        };
        return media.webkitAudioDecodedByteCount ?? 0;
      }),
    ).toBe(0);
    // Decorative: the beat's meaning is carried by the copy and the real
    // catalog record, never by the footage.
    await expect(video).toHaveAttribute("aria-hidden", "true");
  });

  test("reduced motion gets the poster, not the clip", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("#hero").waitFor();

    await expect(page.locator("#authenticity")).toHaveCount(1, { timeout: SECTION_RENDER });
    await expect(page.locator("#authenticity video")).toHaveCount(0);
    await context.close();
  });

  test("the authenticity record shows real catalog data, not the render", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const section = page.locator("#authenticity");
    await expect(section).toHaveCount(1, { timeout: SECTION_RENDER });
    // Four real fields from a real product, and a link into that product.
    await expect(section.locator("dl > div")).toHaveCount(4);
    await expect(section.locator("a[href^='/p/']")).toHaveCount(1);
  });
});

test.describe("interstitial plate (S12)", () => {
  test("is a full-bleed plate with copy, not another card", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const section = page.locator("#interstitial");
    await expect(section).toHaveCount(1);

    const plate = section.locator("img");
    await expect(plate).toHaveCount(1);
    // The plate serves from the pre-built AVIF set, same as the hero.
    expect(await plate.getAttribute("srcset")).toContain("/landing/plates/plate-body-");
    // Atmosphere, so its alt says illustration -- never evidence.
    expect((await plate.getAttribute("alt")) ?? "").not.toBe("");

    const box = (await section.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width, "the plate should reach both edges").toBeCloseTo(viewport.width, -1);
  });

  test("its copy sits on the start-side third", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const heading = page.locator("#interstitial-heading");
    await expect(heading).toBeVisible();
    const box = (await heading.boundingBox())!;
    // RTL: the start side is the right. The plates ship pre-mirrored precisely
    // so this third is the empty one.
    expect(box.x + box.width).toBeGreaterThan(1440 / 2);
  });
});

test.describe("symptom finder (S12)", () => {
  test("reads as symptoms, not as a second copy of the system index", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const cards = page.locator("#symptom-finder a");
    await expect(cards).toHaveCount(10);
    // The SYS-xx codes belong to the hero's index. Repeating them here made
    // this section read as the same list twice (audit item 4, found at S9).
    await expect(page.locator("#symptom-finder")).not.toContainText(/SYS-\d{2}/);
  });
});

test.describe("brand wall (S13)", () => {
  test("names its scrolling region and never tabs into the seamless duplicate", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const wall = page.locator("#brand-wall");
    test.skip((await wall.count()) === 0, "no brands seeded");
    await wall.locator(".motion-marquee-track").waitFor();

    // The duplicate copy exists only so the loop has no visible seam. It is
    // aria-hidden AND inert -- aria-hidden alone hides it from assistive tech
    // but leaves it in the tab order, so a sighted keyboard user would tab
    // through invisible links.
    //
    // Scoped to the track's own child rather than to every `aria-hidden` in the
    // wall: the separators between brand names are hidden too (P12.S12), and
    // they are decoration inside the list, not the duplicate this is about.
    const duplicate = wall.locator(".motion-marquee-track > [aria-hidden='true']");
    await expect(duplicate).toHaveCount(1);
    await expect(duplicate).toHaveAttribute("inert", /.*/);

    // The scrolling region carries its own name; the section heading names the
    // section, not the group of links inside it.
    await expect(wall.getByRole("group")).toHaveAttribute("aria-label", /\S/);
  });

  test("the marquee pauses for reduced motion, in CSS as well as in JS", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const wall = page.locator("#brand-wall");
    if ((await wall.count()) > 0) {
      const track = wall.locator(".motion-marquee-track");
      await track.waitFor();
      // `animation: none` from globals.css, not merely an absent inline style:
      // the CSS rule is what covers the SSR paint that lands before hydration
      // has decided anything. Polled because the section streams in.
      await expect
        .poll(() => track.evaluate((el) => getComputedStyle(el).animationName))
        .toBe("none");
    }
    await context.close();
  });
});

test.describe("deals (S13)", () => {
  test("renders nothing at all until live deals exist, not an empty husk", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    // No section, no heading, no landmark. A husk would advertise discounts the
    // store cannot honour and leave a dead entry in the accessibility tree.
    await expect(page.locator("#deals")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "پیشنهادهای ویژه" })).toHaveCount(0);
  });
});

test.describe("closing beat (S14)", () => {
  test("folds the four steps, real contact and one CTA into a single beat", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const closing = page.locator("#closing");
    await expect(closing).toHaveCount(1, { timeout: SECTION_RENDER });

    // A real ordered list -- the numbering is the content, not decoration.
    await expect(closing.locator("ol > li")).toHaveCount(4);

    // The three sections this replaced are gone, not merely hidden: each one
    // restated that the visit was over without giving anyone anywhere to go.
    for (const id of ["#how-it-works", "#support", "#numbers"]) {
      await expect(page.locator(id)).toHaveCount(0);
    }
  });

  test("offers only contact channels that actually reach someone", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();
    const closing = page.locator("#closing");
    await expect(closing).toHaveCount(1, { timeout: SECTION_RENDER });

    // Owner-supplied phone and Telegram. `tel:` carries the unambiguous
    // international form; the visitor reads Persian digits of what they'd dial.
    const phone = closing.locator("a[href^='tel:']");
    await expect(phone).toHaveAttribute("href", "tel:+989120570658");
    await expect(phone).toHaveText("۰۹۱۲۰۵۷۰۶۵۸");
    await expect(closing.locator("a[href='https://t.me/boyinshadows']")).toHaveCount(1);

    // WhatsApp is named by the spec but the owner has supplied no number, so it
    // is absent rather than dead-linked (fableTasks §7 item 7). A wa.me link
    // here would be a promise the store cannot keep.
    await expect(closing.locator("a[href*='wa.me']")).toHaveCount(0);
  });

  test("the CTA returns to the vehicle selector, and the target exists", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();
    const closing = page.locator("#closing");
    await expect(closing).toHaveCount(1, { timeout: SECTION_RENDER });

    await expect(closing.locator("a[href='#driver-path']")).toHaveCount(1);
    // An anchor pointing at nothing is a broken promise the browser hides.
    await expect(page.locator("#driver-path")).toHaveCount(1);
  });

  test("newsletter and guides stay hidden behind their flags", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();

    // Hidden on purpose (fableTasks §7 item 6), not deleted: both are finished
    // work waiting on something outside the code.
    await expect(page.locator("#newsletter")).toHaveCount(0);
    await expect(page.locator("#guides")).toHaveCount(0);
  });
});

test.describe("closing beat accessibility (S14)", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`has zero axe violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/");
      await page.locator("#hero").waitFor();
      await expect(page.locator("#closing")).toHaveCount(1, { timeout: SECTION_RENDER });

      const results = await new AxeBuilder({ page }).include("#closing").analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("closing ambience (S15)", () => {
  test("desktop stages the closing beat with chapter-4, decorative and silent", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const video = page.locator("#closing video");
    await expect(video).toHaveCount(1, { timeout: SECTION_RENDER });
    await expect(video).toHaveAttribute("src", "/landing/video/chapter-4.mp4");
    // Same guarantees the authenticity stage carries: silent, looping, and
    // announced to nobody -- every fact in this beat is markup on top of it.
    expect(await video.evaluate((node) => (node as HTMLVideoElement).muted)).toBe(true);
    await expect(video).toHaveAttribute("loop", /.*/);
    await expect(video).toHaveAttribute("aria-hidden", "true");

    // The poster is the real content underneath, so it keeps a describing alt.
    const poster = page.locator("#closing img");
    await expect(poster).toHaveCount(1);
    expect(await poster.getAttribute("srcset")).toContain("/landing/video/chapter-4-poster-");
    expect((await poster.getAttribute("alt")) ?? "").not.toBe("");
  });

  test("mobile fetches zero video bytes with two clips on the page", async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/landing/video/") && request.url().endsWith(".mp4")) {
        videoRequests.push(request.url());
      }
    });

    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.locator("#hero").waitFor();
    await expect(page.locator("#closing")).toHaveCount(1, { timeout: SECTION_RENDER });
    // The videos mount on hydration, never in the SSR HTML, so the absence has
    // to be given time to prove itself rather than measured before it could
    // have happened.
    await page.waitForTimeout(2_000);

    // The page now carries two stages. The S11 version of this test could pass
    // while a second clip downloaded, which is exactly the mistake this step
    // could have made.
    expect(videoRequests).toEqual([]);
    await expect(page.locator("#closing video")).toHaveCount(0);
    await expect(page.locator("#closing img")).toHaveCount(1);
  });

  test("reduced motion gets the poster, not the clip", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator("#hero").waitFor();

    await expect(page.locator("#closing")).toHaveCount(1, { timeout: SECTION_RENDER });
    await expect(page.locator("#closing video")).toHaveCount(0);
    await expect(page.locator("#closing img")).toHaveCount(1);
    await context.close();
  });

  test("the copy stays readable over the ambience, in both themes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/");
      await page.locator("#hero").waitFor();
      await expect(page.locator("#closing")).toHaveCount(1, { timeout: SECTION_RENDER });

      // Contrast is the whole reason the scrim exists: the beat is graphite-950
      // copy-on-footage, and axe's colour-contrast rule is what proves the
      // scrim is actually doing its job rather than merely being present.
      const results = await new AxeBuilder({ page }).include("#closing").analyze();
      expect(results.violations, `${theme} mode`).toEqual([]);
    }
  });
});

test.describe("footer (S15)", () => {
  test("shows no placeholder trust seal", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").waitFor();

    // This assertion is REVERSED as of P14.S6, at the owner's call. Both seals
    // are blocked on the business registration (masterPlan §11), and the
    // footer used to reserve two dashed slots labelled "pending registration".
    // An empty box announcing that a trust seal does not exist yet is a worse
    // trust signal than no box, so the slots are gone. When the assets arrive
    // this test flips back with them.
    await expect(page.locator("footer [role='img']")).toHaveCount(0);
    await expect(page.locator("footer")).not.toContainText("اینماد");
    await expect(page.locator("footer")).not.toContainText("نشان ملی");
  });

  test("shows exactly the channels the closing beat shows", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").waitFor();
    await expect(page.locator("#closing")).toHaveCount(1, { timeout: SECTION_RENDER });

    const hrefsIn = (selector: string) =>
      page
        .locator(
          `${selector} a[href^='tel:'], ${selector} a[href^='https://t.me/'], ${selector} a[href*='wa.me']`,
        )
        .evaluateAll((anchors) =>
          anchors.map((anchor) => anchor.getAttribute("href") ?? "").sort(),
        );

    const footerHrefs = await hrefsIn("footer");
    // One source (lib/contact-info.ts) feeds both, so any drift between them is
    // a bug in one of the two renderings rather than a data question.
    expect(footerHrefs).toEqual(await hrefsIn("#closing"));
    expect(footerHrefs).toEqual(["https://t.me/boyinshadows", "tel:+989120570658"]);

    // Persian digits, same as the beat -- this is a Persian page (§7.5).
    await expect(page.locator("footer a[href^='tel:']")).toHaveText("۰۹۱۲۰۵۷۰۶۵۸");
    // Each link is named by its channel, so "۰۹۱۲…" and "@boyin…" are not two
    // anonymous strings to a screen reader.
    await expect(page.locator("footer a[href^='tel:']")).toHaveAttribute("aria-label", /\S+:/);
  });

  test("the copyright year renders in Persian digits", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").waitFor();
    // It was the last Latin numeral in the footer.
    const line = (await page.locator("footer").last().textContent()) ?? "";
    expect(line).toMatch(/[۰-۹]{4}/);
    expect(line).not.toMatch(/20\d{2}/);
  });

  test("every category and vehicle column link resolves", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").waitFor();

    const hrefs = await page
      .locator("footer a[href^='/c/'], footer a[href^='/vehicle/'], footer a[href^='/brand/']")
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
    // The columns are built from the real taxonomy and the real vehicle tree,
    // so an empty set here means a fetch degraded rather than that there is
    // nothing to check.
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });
});
