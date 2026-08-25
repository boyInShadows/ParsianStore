import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The three information pages that closed the first half of fableTasks §7 item
 * 10 -- /about, /contact and /faq. S16's link sweep found the footer pointing
 * at seven of these and all seven 404ing; the owner hid the column rather than
 * ship dead links. This is what lets it be un-hidden without that happening
 * again.
 */

const PAGES = [
  { path: "/about", code: "ABOUT" },
  { path: "/contact", code: "CONTACT" },
  { path: "/faq", code: "FAQ" },
] as const;

async function open(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(200);
  await page.locator("main").waitFor();
}

for (const { path, code } of PAGES) {
  test(`${path} renders with a heading and its record code`, async ({ page }) => {
    await open(page, path);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).not.toBeEmpty();
    await expect(page.getByText(code, { exact: true })).toBeVisible();
  });

  test(`${path} has zero axe violations in both themes`, async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
      await page.emulateMedia({ colorScheme: theme });
      await open(page, path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `${path} in ${theme}`).toEqual([]);
    }
  });

  test(`${path} does not scroll sideways at 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await open(page, path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  });
}

test("the footer lists exactly the information pages that exist", async ({ page }) => {
  await open(page, "/");
  const hrefs = await page
    .locator("footer a[href^='/about'], footer a[href^='/contact'], footer a[href^='/faq']")
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.sort()).toEqual(["/about", "/contact", "/faq"]);

  // The four legal pages have no routes yet, so they must not be linked. This
  // is the assertion that stops someone re-adding the whole seven-item list.
  const dead = await page
    .locator("footer a")
    .evaluateAll((anchors) =>
      anchors
        .map((a) => a.getAttribute("href") ?? "")
        .filter((href) => ["/returns", "/warranty", "/privacy", "/terms"].includes(href)),
    );
  expect(dead, "the footer links a policy page that does not exist").toEqual([]);
});

test("the FAQ answers open and close without JavaScript deciding anything", async ({ page }) => {
  await open(page, "/faq");
  const first = page.locator("main details").first();
  const answer = first.locator("p");

  await expect(answer).toBeHidden();
  await first.locator("summary").click();
  await expect(answer).toBeVisible();
  await first.locator("summary").click();
  await expect(answer).toBeHidden();
});

test("the contact page shows the same channels the footer does", async ({ page }) => {
  await open(page, "/contact");
  const contactHrefs = await page
    .locator("main a[href^='tel:'], main a[href^='https://t.me/']")
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? "").sort());

  await open(page, "/");
  const footerHrefs = await page
    .locator("footer a[href^='tel:'], footer a[href^='https://t.me/']")
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? "").sort());

  // Both read `lib/contact-info.ts`. If they ever disagree, one of them grew a
  // hardcoded number.
  expect(contactHrefs).toEqual(footerHrefs);
  expect(contactHrefs.length).toBeGreaterThan(0);
});

test("the browser is given a real icon instead of probing for a missing one", async ({ page }) => {
  await open(page, "/");
  const icon = page.locator('link[rel="icon"]').first();
  await expect(icon).toHaveCount(1);
  const href = await icon.getAttribute("href");
  expect(href, "no <link rel=icon>, so browsers fall back to /favicon.ico").toBeTruthy();
  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
});
