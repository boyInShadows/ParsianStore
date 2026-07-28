import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// P1.S7 DoD: "Every primitive on a /styleguide page; axe: 0 violations."
test("styleguide page has zero axe violations", async ({ page }) => {
  await page.goto("/styleguide");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("styleguide page has zero axe violations with a modal open", async ({ page }) => {
  await page.goto("/styleguide");
  await page.getByRole("button", { name: "باز کردن پنجره" }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
