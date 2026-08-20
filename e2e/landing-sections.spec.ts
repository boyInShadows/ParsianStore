import { test, expect } from "@playwright/test";

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
      await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

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

test("the landing page never scrolls sideways", async ({ page }) => {
  for (const viewport of [NARROW, MOBILE, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
  }
});

test.describe("shop-by-system absorbed into the hero (S9)", () => {
  test("the standalone grid is gone but its landmark survives", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("section#shop-by-system")).toHaveCount(0);
    // The heading stays as an sr-only landmark on the hero's index rail, so
    // deleting the section did not also delete the page's semantics.
    const heading = page.locator("#shop-by-system-heading");
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveText(/\S/);
  });

  test("the hero rail carries all ten systems, once each", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const heroHrefs = await page
      .locator("#hero a[href^='/c/']")
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
