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

// Dark mode was never audited here, and it hid two real contrast failures
// that shipped in Badge: white on `success` (3.30:1 light / 2.27:1 dark) and
// white on `danger` in dark (3.38:1). Both are fixed via --success-fg /
// --danger-fg; this test is what stops them coming back.
test("styleguide page has zero axe violations in dark mode", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("/styleguide");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// masterPlan §10's accessibility floor: ">= 44x44px touch targets". This
// caught three real violations the class names alone did not reveal --
// Pagination's buttons said w-12 but flex-shrink squeezed them to 41px, and
// Chip's remove button was 16x16.
test("every styleguide control meets the 44px touch-target floor", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/styleguide");
  await page.waitForLoadState("networkidle");

  // Scoped to <main>: Next.js's dev overlay injects its own small buttons.
  const controls = await page.locator("main").getByRole("button").all();
  const undersized: string[] = [];
  for (const control of controls) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (!box) continue;
    if (box.height < 44 || box.width < 44) {
      undersized.push(`"${(await control.textContent())?.trim()}" ${box.width}x${box.height}`);
    }
  }
  expect(undersized).toEqual([]);
});
