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

  test("the rail scrolls sideways instead of growing the page", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");
    await page.locator("#hero").waitFor();

    const section = page.locator("#best-sellers");
    test.skip((await section.count()) === 0, "no featured products seeded");

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
    await expect(wall.locator("[aria-hidden='true']")).toHaveAttribute("inert", /.*/);

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
  test("keeps a slot for each trust seal that is still unregistered", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").waitFor();

    // Both seals are blocked on the business registration (masterPlan §11), so
    // the footer reserves labelled slots rather than either faking a seal or
    // silently leaving no room for one.
    const seals = page.locator("footer [role='img']");
    await expect(seals).toHaveCount(2);
    await expect(seals.first()).toHaveAttribute("aria-label", /نماد اعتماد/);
    await expect(seals.nth(1)).toHaveAttribute("aria-label", /نشان ملی/);
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
