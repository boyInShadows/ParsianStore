/**
 * The hero scrub harness (fableTasks v1.1 P13.S0).
 *
 * Phase 13 rewrites the hero's choreography, and every step in it accepts on
 * "what does the stage look like at p = x". Until this existed that question
 * was answered by scrolling the page by hand, which is why the audit this
 * phase came from could not shrink its own browser below 1382px and marked
 * every mobile finding unverified.
 *
 * ## Why the sample points are imported, not written down
 *
 * A filmstrip at evenly spaced progress values is the obvious thing and it is
 * the wrong thing: with `BEAT_SPAN` at 0.42 a slot's peak is narrow, so evenly
 * spaced samples land in the gaps between beats and the contact sheet shows a
 * docked car at nine of thirteen frames. The interesting positions are the
 * *hold midpoints* -- the one place a part is stationary at its peak -- and the
 * chapter boundaries, where the invariant says the car must be whole.
 *
 * Both are computed by `heroLayout.ts`, so this script imports it rather than
 * transcribing numbers that move whenever `BEAT_SPAN`, `COVER_SWING` or a
 * chapter range is retuned. `e2e/landing-hero.spec.ts` derives its own samples
 * the same way and for the same reason.
 *
 * Node 24 strips TypeScript types natively, so a `.mjs` can import a `.ts`
 * module directly given the explicit extension. That is what keeps this a
 * plain script with no new dependency -- `tsx` is not a root dependency and
 * adding one would need the owner (CLAUDE.md §3).
 *
 * ## Serve a build, not `next dev`
 *
 * `next dev` rewrites `.next/prerender-manifest.json` non-atomically as it
 * compiles routes; on a 10,500px page whose prefetches fan out, a short write
 * lands on top of a long one and every route 500s for the rest of the process.
 * The Playwright config carries the full story. Shots from a dev server are
 * also not the code that ships.
 *
 * Usage:
 *   pnpm build
 *   pnpm --filter web exec next start -p 3200
 *   SHOTS_BASE_URL=http://localhost:3200 pnpm shots:hero
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  CHAPTER_RANGE,
  CHAPTER_SEQUENCE,
  beatFor,
  coverOf,
} from "../apps/web/components/landing/HeroV2/heroLayout.ts";

const BASE_URL = process.env.SHOTS_BASE_URL ?? "http://localhost:3000";
const OUT_ROOT = process.env.SHOTS_OUT ?? path.join("docs", "shots", "p13");

/**
 * 1440x900 and 390x844 on purpose.
 *
 * 1440x900 is the laptop the acceptance frame is written for (§4: "scroll the
 * page on a laptop trackpad"), and its 900px height is what decides whether
 * the job card clears the fold -- a 1440x1080 shot would hide the very defect
 * P13.S7 exists to fix. 390x844 is the iPhone-class viewport the landing
 * baselines already use, so a Phase 13 shot and a Playwright baseline can be
 * compared without rescaling.
 */
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

const THEMES = ["dark", "light"];

/**
 * The scroll positions worth a frame, derived from the layout module.
 *
 * Four kinds, and each answers a question some step's Accept asks:
 *  - `rest`      the chapter boundaries, where every part must be docked
 *  - `hold`      a slot's hold midpoint: one part stationary at its peak
 *  - `camera`    the first quarter of each chapter, where P13.S2's move plays
 *  - `finale`    beat 4's hold and the re-dock at the end of the track
 */
function samplePoints() {
  const points = [{ p: 0, what: "arrival, everything docked" }];

  for (const chapter of [1, 2, 3]) {
    const [from, to] = CHAPTER_RANGE[chapter];
    const cover = coverOf(chapter);

    points.push({
      p: round(from + (to - from) * 0.12),
      what: `chapter ${chapter} camera move${cover ? `, ${cover} opening` : ""}`,
    });

    CHAPTER_SEQUENCE[chapter].forEach((ids, slot) => {
      const beat = beatFor(chapter, slot);
      points.push({
        p: round((beat[1] + beat[2]) / 2),
        what: `chapter ${chapter} hold: ${ids.join(" + ")}${cover ? ` (under an open ${cover})` : ""}`,
      });
    });

    const next = CHAPTER_RANGE[chapter + 1];
    if (next) {
      points.push({
        p: round((to + next[0]) / 2),
        what: `rest beat after chapter ${chapter} -- the car must be whole`,
      });
    }
  }

  // Beat 4. These are the plan's own numbers rather than the layout module's,
  // because the finale does not exist yet -- P13.S8 adds it. Sampling here
  // from the start means the "before" contact sheet shows what the finale
  // replaces instead of stopping at chapter 3.
  points.push({ p: 0.92, what: "finale hold -- exploded catalogue + CTA" });
  points.push({ p: 1, what: "end of track -- re-docked (Gate B)" });

  return dedupe(points);
}

const round = (value) => Number(value.toFixed(4));

/** Two derived points can collide when a beat ends exactly where the next rests. */
function dedupe(points) {
  const seen = new Map();
  for (const point of points) if (!seen.has(point.p)) seen.set(point.p, point);
  return [...seen.values()].sort((a, b) => a.p - b.p);
}

/**
 * The same document-coordinate mapping `e2e/landing-hero.spec.ts` uses.
 *
 * Read in document coordinates, never from a viewport-relative box: measuring
 * after an earlier scroll would aim at a target that has already moved, which
 * presents as "the scroll worked but nothing animated" -- the most confusing
 * possible failure for a scroll-linked page.
 */
async function scrollHeroTo(page, fraction) {
  await page.evaluate((f) => {
    const track = document.querySelector(".hero-track");
    if (!track) throw new Error("no .hero-track on the page");
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.getBoundingClientRect().height - window.innerHeight;
    window.scrollTo(0, top + travel * f);
  }, fraction);
  // Long enough for a scroll-linked transform to settle, short enough that a
  // 32-frame run stays under the step's 90s budget.
  await page.waitForTimeout(300);
}

/**
 * Fail loudly on the two environment faults that produce a plausible-looking
 * but worthless contact sheet.
 *
 * A dead Postgres container does not error -- `ShopByVehicle` returns null, the
 * section vanishes, and the page still renders. One earlier pass baked a page
 * missing a whole section into six screenshot baselines before anyone noticed.
 * An unbuilt or wrong-origin server gives a hero with no track.
 */
async function assertPageIsReal(page) {
  const track = await page.locator(".hero-track").count();
  if (track !== 1) {
    throw new Error(
      `Expected exactly one .hero-track, found ${track}. The server is not serving this app, ` +
        `or the hero failed to render. Check SHOTS_BASE_URL and that you served a build.`,
    );
  }
  const vehicles = await page.locator("#shop-by-vehicle").count();
  if (vehicles === 0) {
    throw new Error(
      "#shop-by-vehicle is missing, which is what a dead Postgres container looks like from " +
        "the page: the section returns null rather than erroring. Run `docker ps -a`, bring " +
        "the database back, and re-run -- shots taken now would bake a page with a hole in it.",
    );
  }
}

async function shoot() {
  const started = Date.now();
  const points = samplePoints();
  const browser = await chromium.launch();
  const taken = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          // next-themes reads this key before paint; setting it here avoids a
          // theme flash landing in the first frame of every run.
          storageState: { cookies: [], origins: [] },
        });
        await context.addInitScript(
          ([key, value]) => window.localStorage.setItem(key, value),
          ["theme", theme],
        );

        const page = await context.newPage();
        await page.goto(BASE_URL, { waitUntil: "networkidle" });
        await page.locator("#hero").waitFor();
        await assertPageIsReal(page);

        const dir = path.join(OUT_ROOT, viewport.name, theme);
        await mkdir(dir, { recursive: true });

        const stage = page.locator(".hero-pin");
        for (const point of points) {
          await scrollHeroTo(page, point.p);
          const file = path.join(dir, `${point.p.toFixed(4)}.png`);
          // The pinned block, not the viewport: a viewport shot of a sticky
          // element includes whatever happens to be scrolling past beside it,
          // so two frames differ for reasons that are not the hero.
          await stage.screenshot({ path: file });
          taken.push({ viewport: viewport.name, theme, ...point, file });
        }

        await scrollHeroTo(page, 0);
        await page.screenshot({
          path: path.join(dir, "full-page.png"),
          fullPage: true,
        });

        await context.close();
      }
    }

    await writeContactSheet(points, taken);
  } finally {
    await browser.close();
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `${taken.length} frames + ${VIEWPORTS.length * THEMES.length} full-page shots in ${seconds}s`,
  );
  console.log(`Contact sheet: ${path.join(OUT_ROOT, "index.html")}`);
}

/**
 * A plain HTML index, one row per scroll position, one column per
 * viewport/theme.
 *
 * The sheet is what goes in a commit body and a review; the PNGs themselves
 * are gitignored. Reviewing a scroll-linked change frame by frame in a
 * directory listing does not work -- the whole point is seeing p=0.11 next to
 * p=0.15.
 */
async function writeContactSheet(points, taken) {
  const columns = VIEWPORTS.flatMap((v) => THEMES.map((t) => ({ viewport: v.name, theme: t })));
  const cell = (p, column) => {
    const shot = taken.find(
      (s) => s.p === p && s.viewport === column.viewport && s.theme === column.theme,
    );
    if (!shot) return "<td></td>";
    const src = path.posix.join(column.viewport, column.theme, `${p.toFixed(4)}.png`);
    return `<td><img src="${src}" loading="lazy" alt="p=${p} ${column.viewport} ${column.theme}"></td>`;
  };

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Hero scrub — Phase 13</title>
<style>
  /* System colours, not tokens and not hex. This sheet is a local dev
     artefact rather than product UI, so borrowing the app's palette would
     imply it is part of the design system; and a hex literal here would be a
     real no-raw-hex violation, since that rule does not care that the file
     never ships. Canvas / CanvasText / GrayText follow the reviewer's own OS
     theme, which is the right behaviour for a tool anyway.
     (No backticks in this comment: it lives inside a JS template literal.) */
  body { font: 13px/1.5 system-ui, sans-serif; margin: 24px;
         background: Canvas; color: CanvasText; color-scheme: light dark; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid GrayText; padding: 6px; vertical-align: top; }
  th { position: sticky; top: 0; background: Canvas; text-align: start; }
  img { display: block; width: 320px; height: auto; }
  .p { font-family: ui-monospace, monospace; white-space: nowrap; }
  .what { max-width: 22ch; color: GrayText; }
</style></head><body>
<h1>Hero scrub — Phase 13</h1>
<p>${BASE_URL} · ${new Date().toISOString()} · ${points.length} scroll positions</p>
<table><thead><tr><th>p</th><th>what</th>${columns
    .map((c) => `<th>${c.viewport} · ${c.theme}</th>`)
    .join("")}</tr></thead><tbody>
${points
  .map(
    (point) =>
      `<tr><td class="p">${point.p.toFixed(4)}</td><td class="what">${point.what}</td>` +
      columns.map((column) => cell(point.p, column)).join("") +
      `</tr>`,
  )
  .join("\n")}
</tbody></table></body></html>`;

  await writeFile(path.join(OUT_ROOT, "index.html"), html, "utf8");
}

// A stale frame from a previous run is worse than a missing one: it looks like
// evidence and is not.
await rm(OUT_ROOT, { recursive: true, force: true });
await mkdir(OUT_ROOT, { recursive: true });
await shoot();
