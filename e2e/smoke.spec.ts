import { test, expect } from "@playwright/test";

// Original P0.S3 debug page smoke test. Selectors updated as the page
// gained i18n (P1.S4) and the layout shell (P1.S9). Also caught a real bug
// here: without `localeDetection: false` (i18n/routing.ts), a browser with
// an English Accept-Language header -- like headless Chromium's default --
// would see the untranslated English copy at "/" instead of fa.
test("debug page renders fa by default and reaches the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "پارسیان" })).toBeVisible();
  await expect(page.getByText("وضعیت API: up")).toBeVisible();
});
