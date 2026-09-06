/**
 * The landing page's Open Graph card (fableTasks v1.1 P13.S9).
 *
 * The audit found no `og:image` at all and `twitter:card=summary`, so a shared
 * link showed a thumbnail beside text -- for a page whose whole argument is a
 * picture of a car coming apart.
 *
 * ## It is rendered from the page, not drawn beside it
 *
 * The card is a screenshot of the hero at its finale beat: the stripped body
 * with all ten parts parked around it, which is the single frame this phase was
 * built to reach. A hand-made image would be a second thing to keep in step
 * with the first, and it would start drifting the day a sprite is re-cut. This
 * cannot drift -- re-run it and the card is whatever the hero currently is.
 *
 * ## Why it measures before it shoots
 *
 * 1200x630 is Open Graph's standard size and it is not the stage's aspect
 * ratio. The first cut simply cropped a 1200x630 region centred on the stage,
 * and because the stage is only about 1020 CSS pixels wide even on a 1600px
 * viewport, that crop reached past its edge and pulled a strip of the job
 * card's thumbnails into the picture.
 *
 * So it opens the page once to measure the stage, works out the crop that has
 * the card's aspect ratio and fits *inside* it, and reopens with
 * `deviceScaleFactor` set to the exact ratio that turns that crop into 1200x630.
 * Nothing outside the diagram can appear, and the output size is still the one
 * the metadata declares.
 *
 * Usage:
 *   pnpm build && pnpm --filter web exec next start -p 3200
 *   SHOTS_BASE_URL=http://localhost:3200 pnpm og:landing
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { FINALE_BEAT } from "../apps/web/components/landing/HeroV2/heroLayout.ts";

const BASE_URL = process.env.SHOTS_BASE_URL ?? "http://localhost:3000";
const OUT = path.join("apps", "web", "public", "og", "landing.png");

/** Open Graph's own recommended size. Anything else gets re-cropped by them. */
const CARD = { width: 1200, height: 630 };

/** The middle of the finale's hold: every part parked, nothing still moving. */
const FINALE = (FINALE_BEAT[1] + FINALE_BEAT[2]) / 2;

const browser = await chromium.launch();

/**
 * Open the page, scroll to the finale, and hand back the page plus the stage's
 * box. Called twice -- once to measure, once to shoot at the right scale.
 */
async function openAtFinale(deviceScaleFactor) {
  const context = await browser.newContext({
    // Wide enough for the `lg` layout, so the card shows the finale as a
    // desktop visitor sees it rather than the stacked phone version.
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor,
  });
  // The stage keeps its dark ground in both themes, but the page around it does
  // not, and a card is more legible against the dark one.
  await context.addInitScript(() => window.localStorage.setItem("theme", "dark"));

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.locator("#hero").waitFor();

  // The same dead-database guard the scrub harness carries. A card baked from a
  // page with a missing section is worse than no card, because nobody re-checks
  // an image that already exists.
  if ((await page.locator("#shop-by-vehicle").count()) === 0) {
    throw new Error(
      "#shop-by-vehicle is missing, which is what a dead Postgres container looks like from " +
        "the page. Bring the database back before baking an OG card from it.",
    );
  }

  await page.evaluate((fraction) => {
    const track = document.querySelector(".hero-track");
    if (!track) throw new Error("no .hero-track on the page");
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.getBoundingClientRect().height - window.innerHeight;
    window.scrollTo(0, top + travel * fraction);
  }, FINALE);
  await page.waitForTimeout(600);

  const stage = await page.locator(".hero-stage").boundingBox();
  if (!stage) throw new Error("the stage has no box to crop to");
  return { context, page, stage };
}

/** The largest region with the card's aspect ratio that fits inside the stage. */
function cropFor(stage) {
  const ratio = CARD.width / CARD.height;
  const width = Math.min(stage.width, stage.height * ratio);
  const height = width / ratio;
  return {
    x: stage.x + (stage.width - width) / 2,
    y: stage.y + (stage.height - height) / 2,
    width,
    height,
  };
}

const measured = await openAtFinale(1);
const crop = cropFor(measured.stage);
await measured.context.close();

// `clip` is in CSS pixels and the output is clip x deviceScaleFactor, so this
// is the one number that turns the crop into the card.
const scale = CARD.width / crop.width;
const shot = await openAtFinale(scale);
const finalCrop = cropFor(shot.stage);

await mkdir(path.dirname(OUT), { recursive: true });
await shot.page.screenshot({ path: OUT, clip: finalCrop });
await shot.context.close();
await browser.close();

console.log(
  `${OUT} — ${CARD.width}x${CARD.height} at ${scale.toFixed(3)}x, hero finale p=${FINALE.toFixed(3)}`,
);
