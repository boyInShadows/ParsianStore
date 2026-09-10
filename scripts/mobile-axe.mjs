/**
 * P14.S6 accessibility + behaviour check on `/` at 390x844, both themes.
 *
 * Runs axe over the landing page in three states -- as it loads, with the
 * mobile menu open, and with the symptom expander open -- because two of the
 * three only exist on a phone and neither is reachable from the desktop suite.
 *
 * Also asserts the two numbers the step is judged on that a screenshot cannot
 * show: `scrollWidth === clientWidth`, and the header's collapse/re-expand.
 */
import { chromium, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:3200";
let failed = false;

async function report(label, results) {
  if (results.violations.length === 0) {
    console.log(`  axe ${label}: 0 violations`);
    return;
  }
  failed = true;
  console.log(`  axe ${label}: ${results.violations.length} violations`);
  for (const violation of results.violations) {
    console.log(`    [${violation.impact}] ${violation.id} -- ${violation.help}`);
    for (const node of violation.nodes.slice(0, 3)) console.log(`      ${node.target.join(" ")}`);
  }
}

const browser = await chromium.launch();

for (const theme of ["dark", "light"]) {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "fa-IR",
  });
  await context.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  console.log(`\n${theme}:`);

  await report(`${theme} / landing`, await new AxeBuilder({ page }).analyze());

  // Header collapse. The listener ignores deltas under 4px and only collapses
  // past 80px of downward travel, so the assertion drives real scroll offsets.
  const header = page.locator("body > div > header").first();
  const heightAt = async (y) => {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(500);
    return header.evaluate((el) => Math.round(el.getBoundingClientRect().height));
  };
  const atTop = await heightAt(0);
  const scrolledDown = await heightAt(600);
  const scrolledBackUp = await heightAt(300);
  console.log(
    `  header height: y=0 ${atTop}px -> y=600 ${scrolledDown}px -> back up ${scrolledBackUp}px`,
  );
  if (!(atTop <= 104 && scrolledDown < atTop && scrolledBackUp === atTop)) {
    failed = true;
    console.log("    FAIL: header did not collapse and re-expand within the 104px ceiling");
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "باز کردن منو" }).click();
  await page.waitForTimeout(400);
  await report(`${theme} / menu open`, await new AxeBuilder({ page }).analyze());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // The symptom expander and the two footer disclosures, opened.
  await page.locator('label[for="symptom-more"]').click();
  await page.locator('label[for="footer-brands"]').click();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await report(`${theme} / disclosures open`, await new AxeBuilder({ page }).analyze());

  const width = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log(
    `  with every disclosure open: scrollWidth=${width.scrollWidth} clientWidth=${width.clientWidth}`,
  );
  if (width.scrollWidth !== width.clientWidth) {
    failed = true;
    console.log("    FAIL: horizontal overflow with disclosures open");
  }

  await context.close();
}

await browser.close();
process.exitCode = failed ? 1 : 0;
