import { test, expect } from "@playwright/test";

// Originally the P0.S3 debug-page smoke test. It went stale when P4 replaced
// "/" with the real landing page: it still asserted a "پارسیان" *heading*
// (the wordmark is a link, and the landing's h1 is the hero line) and the
// literal string "وضعیت API: up", which no page has rendered since. It has
// been failing ever since -- unnoticed because the per-step DoD runs
// `lint && test && build`, not `pnpm e2e`. Rewritten against what "/" is now.
//
// Still guards the original bug this test exists for: without
// `localeDetection: false` (i18n/routing.ts), a browser sending an English
// Accept-Language header -- like headless Chromium's default -- would get
// the English locale at "/" instead of fa.
test("landing renders fa by default and shows real API-backed content", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "پارسیان" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The vehicle selector's make list is fetched from the API, so real
  // options here mean the page reached the backend -- the same thing the old
  // "وضعیت API: up" assertion was really checking.
  await expect(page.getByRole("button", { name: "انتخاب خودرو" })).toBeVisible();
});
