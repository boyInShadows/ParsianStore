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
  // 1 car + 9 parts. A missing render would show up here as a short count
  // rather than as a silently broken image.
  await expect(stage.locator("img")).toHaveCount(10);
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
    expect(source).toMatch(/\/landing\/cutouts\/[a-z-]+-\d+\.avif$/);
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

test("reduced motion shows the separated diagram, never the collapsed frame", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await gotoHero(page);

  // The collapsed first frame stacks every part on the car. Separated means
  // the layers occupy visibly different boxes.
  //
  // Polled rather than read once: the stage sits inside the pin and its track,
  // and the reduced-motion rules that flatten both land a beat after `#hero`
  // first exists, so a single synchronous read can catch every layer still
  // sharing one x. The assertion is unchanged -- only the sampling waits for
  // layout to settle instead of assuming it already has.
  await expect
    .poll(() =>
      page
        .locator(".hero-stage img")
        .evaluateAll(
          (images) =>
            new Set(images.map((image) => Math.round(image.getBoundingClientRect().x))).size,
        ),
    )
    .toBeGreaterThan(5);

  await context.close();
});
