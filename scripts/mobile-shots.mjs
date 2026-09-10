/**
 * P14.S6 mobile evidence harness.
 *
 * Drives `/` at the three phone widths the step is judged at, in both themes,
 * capturing a viewport shot and a full-page shot each, and printing the one
 * number the step's Accept condition names:
 *
 *     document.documentElement.scrollWidth === clientWidth
 *
 * Screenshots land in `docs/shots/p14-s6/<phase>/`, where `<phase>` is the
 * first CLI argument ("before" / "after"), so the two runs sit side by side.
 *
 * Not a rewrite of `scripts/hero-shots.mjs` (P13.S0): that one scrubs the hero
 * through thirteen progress points and knows nothing about the sections below
 * it. This one never scrolls the hero -- it measures the page as a page.
 *
 * Note on `fullPage: true`: fableTasks §0.5 records it rendering a phantom
 * ~75px band above the header on this route. The full-page shots here are for
 * reading section rhythm and the footer, never for judging the fold; the
 * viewport shots are what the fold is judged from.
 */
import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:3200";
const PHASE = process.argv[2] ?? "before";
const OUT = path.join(process.cwd(), "docs", "shots", "p14-s6", PHASE);

/** iPhone-class, Android-class, and the narrowest width the DoD covers. */
const WIDTHS = [360, 390, 412];
const THEMES = ["dark", "light"];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = [];

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        ...devices["Pixel 7"],
        viewport: { width, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: "fa-IR",
      });
      // next-themes reads this key before first paint; setting it on the
      // origin means the page is never captured mid-flip.
      await context.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
      const page = await context.newPage();
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const el = document.documentElement;
        const header = document.querySelector("header");
        const nav = document.querySelector('nav[aria-label="پیمایش پایین صفحه"]');
        return {
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          theme: el.getAttribute("data-theme"),
          headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
          bottomNavHeight: nav ? Math.round(nav.getBoundingClientRect().height) : null,
          // Everything that pokes past the viewport, named, so an overflow is
          // a file-and-selector rather than a number to go hunting for.
          offenders: [...document.querySelectorAll("body *")]
            .filter((node) => {
              const rect = node.getBoundingClientRect();
              return rect.width > 0 && Math.round(rect.right) > el.clientWidth + 1;
            })
            .slice(0, 8)
            .map((node) => {
              const rect = node.getBoundingClientRect();
              return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}.${
                typeof node.className === "string"
                  ? node.className.split(" ").slice(0, 3).join(".")
                  : ""
              } right=${Math.round(rect.right)}`;
            }),
        };
      });

      report.push({ width, theme, ...metrics });

      await page.screenshot({ path: path.join(OUT, `${width}-${theme}-viewport.png`) });
      await page.screenshot({
        path: path.join(OUT, `${width}-${theme}-full.png`),
        fullPage: true,
      });

      // The footer is the other half of this step and it is 10,000px down.
      // `documentElement.scrollHeight`, not `body.scrollHeight`: the body is
      // shorter than the document here and scrolling to it lands in the
      // closing beat, one section short of the thing being photographed.
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page
        .locator("footer")
        .screenshot({ path: path.join(OUT, `${width}-${theme}-footer.png`) });

      // The mobile menu, once -- fableTasks §P14.S6 item 2 asks for evidence of
      // what the drawer holds before it is changed.
      if (width === 390) {
        const menu = page.getByRole("button", { name: "باز کردن منو" });
        if (await menu.isVisible()) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await menu.click();
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(OUT, `${width}-${theme}-drawer.png`) });
        }
      }

      await context.close();
    }
  }

  await browser.close();
  await writeFile(path.join(OUT, "metrics.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  for (const row of report) {
    const clean = row.scrollWidth === row.clientWidth ? "OK " : "OVERFLOW";
    console.log(
      `${clean} ${row.width}px ${row.theme}: scrollWidth=${row.scrollWidth} clientWidth=${row.clientWidth} header=${row.headerHeight}px bottomNav=${row.bottomNavHeight}px`,
    );
    for (const offender of row.offenders) console.log(`        ${offender}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
