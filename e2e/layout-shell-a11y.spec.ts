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

/**
 * The storefront's security headers (2026-09-05). `apps/api` has had
 * `helmet()` since P2 and the storefront had nothing -- which is exactly the
 * shape of gap that survives review, because "we use helmet" is true and
 * covers the wrong half. These pages hold a session and collect an address.
 */
test.describe("security headers", () => {
  const EXPECTED: ReadonlyArray<readonly [string, RegExp]> = [
    ["x-frame-options", /^DENY$/i],
    ["x-content-type-options", /^nosniff$/i],
    ["referrer-policy", /strict-origin-when-cross-origin/i],
    ["permissions-policy", /camera=\(\)/i],
  ];

  test("sends them on a page", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();
    for (const [name, shape] of EXPECTED) {
      expect(headers[name], `${name} missing or wrong`).toMatch(shape);
    }
  });

  test("sends them on a static asset too", async ({ request }) => {
    const response = await request.get("/landing/hero/car-stripped-480.avif");
    expect(response.status()).toBe(200);
    const headers = response.headers();
    for (const [name, shape] of EXPECTED) {
      expect(headers[name], `${name} missing on an asset`).toMatch(shape);
    }
  });

  // The footgun the first cut of this shipped: `NODE_ENV === "production"`
  // looks like the right gate for HSTS, but `next start` sets it -- so every
  // developer running the production server locally, and this suite, got HSTS
  // pinned for `localhost` in their browser profile. It is gated on having
  // been told a real https origin instead, and this suite serves over http.
  test("does not pin HSTS on localhost", async ({ page }) => {
    const response = await page.goto("/");
    expect(response!.headers()["strict-transport-security"]).toBeUndefined();
  });
});
