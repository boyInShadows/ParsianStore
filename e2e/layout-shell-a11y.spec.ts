import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// P1.S9 DoD: fully responsive, keyboard navigable, RTL correct. The layout
// shell (Header/Footer/MobileNav) now wraps every (shop) route.
test("home page (with layout shell) has zero axe violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("mobile menu drawer has zero axe violations when open", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "باز کردن منو" }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
