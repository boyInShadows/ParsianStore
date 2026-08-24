import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * `/vehicle/[make]` -- added at P9.S15 because the footer's vehicle column had
 * always linked here and nothing answered: every make link 404'd, the same
 * class of dead link the 2026-08-14 audit found one level down.
 */

const MAKES = ["saipa", "iran-khodro"];

test.describe("vehicle make index (S15)", () => {
  for (const make of MAKES) {
    test(`/vehicle/${make} answers with that make's coverage`, async ({ page }) => {
      const response = await page.goto(`/vehicle/${make}`);
      expect(response?.status()).toBe(200);

      // One heading per model, and each model either offers generation links
      // or says it has none -- never a link that stops at the model.
      const models = page.locator("section[aria-labelledby='models-heading'] > ul > li");
      expect(await models.count()).toBeGreaterThan(0);

      const hrefs = await page
        .locator("main a[href*='/vehicle/']")
        .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
      expect(hrefs.length, "the page offers no way further in").toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href, "every link from here carries a generation").toMatch(
          /\/vehicle\/[a-z0-9-]+\/[a-z0-9-]+\/\d{4}$/,
        );
      }

      // A sample rather than all 14+: this asserts the route shape is right,
      // and the landing suite already sweeps every link it renders.
      for (const href of hrefs.slice(0, 3)) {
        expect((await page.request.get(href)).status(), href).toBe(200);
      }
    });
  }

  test("an unknown make is a 404, not a degraded page", async ({ page }) => {
    // Degrading here would tell a crawler the URL is real. Only an actual API
    // failure may render the "API down" state (fetchMakeRoute separates them).
    const response = await page.goto("/vehicle/not-a-real-make");
    expect(response?.status()).toBe(404);
  });

  test("years render in Persian digits, hrefs in Latin", async ({ page }) => {
    await page.goto("/vehicle/saipa");
    const chip = page.locator("main a[href*='/vehicle/saipa/']").first();
    await expect(chip).toContainText(/[۰-۹]{4}/);
    // The route segment is the generation's `yearFrom` and stays machine-readable.
    expect(await chip.getAttribute("href")).toMatch(/\/\d{4}$/);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`has zero axe violations in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/vehicle/saipa");
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("the footer's vehicle column reaches it from anywhere", async ({ page }) => {
    await page.goto("/");
    const links = page.locator(
      "footer a[href$='/vehicle/saipa'], footer a[href$='/vehicle/iran-khodro']",
    );
    await expect(links).toHaveCount(2);
  });
});
