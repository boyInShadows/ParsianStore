/**
 * Hero sprite registration check — docs/landing-hero-sprite-brief.md.
 *
 * A matched hero set has one property: the stripped base plus all seven part
 * sprites, stacked at 0,0 with no transform, reconstruct the source render.
 * This script measures that, so "matched" is a number rather than an opinion.
 *
 *   node scripts/check-hero-registration.mjs landing-src/hero/source-car.png
 *   node scripts/check-hero-registration.mjs <source.png> <hero-dir>
 *
 * Reports, per sprite, where its content sits in the frame and how much of the
 * source it accounts for; then the whole-composite agreement. Exit 1 if the set
 * would need hand calibration.
 */
import { Buffer } from "node:buffer";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "car-stripped.png";

// Per-pixel channel delta below which two renders count as the same surface.
// Generative edits re-shade slightly even when geometry holds; 70 is the
// threshold that separated real part removals from codec noise on batch 1.
const SAME_SURFACE = 70;

// Percentage points a sprite must add to its own footprint's agreement before
// it counts as docked, rather than as noise around no change.
const DOCK_MARGIN = 0.1;

async function raw(file, size) {
  const { data, info } = await sharp(file)
    .resize(size, size, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function alphaBox({ data, width, height, channels }) {
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1,
    covered = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < 128) continue;
      covered++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, covered };
}

/** Stack sprites over the base, nearest layer wins, like the browser would. */
function composite(base, layers) {
  const out = Buffer.from(base.data);
  for (const layer of layers) {
    for (let i = 0; i < out.length; i += 4) {
      if (layer.data[i + 3] < 128) continue;
      out[i] = layer.data[i];
      out[i + 1] = layer.data[i + 1];
      out[i + 2] = layer.data[i + 2];
      out[i + 3] = layer.data[i + 3];
    }
  }
  return { ...base, data: out };
}

/**
 * Fraction of pixels whose COLOUR reads as the same surface as the source,
 * measured only where `mask` is opaque.
 *
 * Colour only, and mask-scoped, because the source render is a flat studio
 * frame with an opaque background while every derived layer is transparent
 * outside its subject. Comparing alpha, or comparing everywhere, would score
 * the background difference rather than the artwork and drown the signal --
 * it scored a known-good base at 17%.
 *
 * A layer that is transparent where the mask is opaque counts as a miss: that
 * is a hole in the reconstruction, which is exactly what a sprite is supposed
 * to fill.
 */
function agreement(layer, source, mask) {
  const { width, height, channels } = layer;
  let considered = 0,
    same = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (mask.data[i + 3] < 128) continue;
      considered++;
      if (layer.data[i + 3] < 128) continue;
      const delta = Math.max(
        Math.abs(layer.data[i] - source.data[i]),
        Math.abs(layer.data[i + 1] - source.data[i + 1]),
        Math.abs(layer.data[i + 2] - source.data[i + 2]),
      );
      if (delta <= SAME_SURFACE) same++;
    }
  }
  return considered === 0 ? 0 : same / considered;
}

async function main() {
  const sourceArg = process.argv[2];
  // Second arg lets a rejected batch be re-checked after a fix without
  // shuffling directories, and lets a new batch be compared against an old one.
  const HERO = path.resolve(ROOT, process.argv[3] ?? path.join("landing-src", "hero"));
  if (!sourceArg) {
    console.error("usage: node scripts/check-hero-registration.mjs <source-render.png> [hero-dir]");
    console.error("The source render is the frame every hero output was derived from.");
    process.exitCode = 1;
    return;
  }
  const source = path.resolve(ROOT, sourceArg);
  if (!existsSync(source) || !existsSync(path.join(HERO, BASE))) {
    console.error(`Need both ${sourceArg} and landing-src/hero/${BASE}.`);
    process.exitCode = 1;
    return;
  }

  const size = (await sharp(source).metadata()).width;
  const src = await raw(source, size);
  const base = await raw(path.join(HERO, BASE), size);

  const files = (await readdir(HERO)).filter((f) => f.startsWith("sprite-") && f.endsWith(".png"));
  const layers = [];
  let unregistered = 0;

  console.log(`source ${path.basename(source)} at ${size}²\n`);
  console.log("sprite              box in frame           agreement in that box   verdict");
  for (const file of files.sort()) {
    const layer = await raw(path.join(HERO, file), size);
    const box = alphaBox(layer);
    if (!box) {
      console.log(`  ${file.padEnd(24)} EMPTY`);
      continue;
    }
    // The only question that matters per sprite, measured over the sprite's own
    // silhouette: does that footprint match the source better with the sprite
    // than without it? An in-place isolation fills a hole the base left behind,
    // so `before` is low (bay or interior showing) and `after` is high. A
    // product shot pastes itself over the wrong pixels and `after` drops.
    const before = agreement(base, src, layer);
    const after = agreement(composite(base, [layer]), src, layer);
    // A real dock is not a hairline win. Measured on the batches so far, an
    // in-place isolation improves its own footprint by 34-45 points while a
    // product shot lands between -40 and +1 -- so anything under DOCK_MARGIN is
    // noise, and passing it would let a centred render through. That is not
    // hypothetical: the combined-headlights sprite is visibly a product shot
    // and scored +1.
    const registered = after - before >= DOCK_MARGIN;
    if (!registered) unregistered++;
    console.log(
      `  ${path.basename(file, ".png").padEnd(20)}` +
        `${String(box.x).padStart(4)},${String(box.y).padEnd(5)} ${box.w}x${box.h}`.padEnd(23) +
        `${(before * 100).toFixed(0)}% -> ${(after * 100).toFixed(0)}%`.padStart(16) +
        (registered ? "     docks" : "     NOT REGISTERED"),
    );
    layers.push(layer);
  }

  // Whole-set score, measured over the reconstruction's own silhouette: how
  // much of the car it rebuilds actually looks like the master.
  const stacked = composite(base, layers);
  const baseOnly = agreement(base, src, stacked);
  const withSprites = agreement(stacked, src, stacked);

  console.log(`\nreconstruction against the source render:`);
  console.log(`  stripped base alone      ${(baseOnly * 100).toFixed(1)}%`);
  console.log(`  base + all sprites       ${(withSprites * 100).toFixed(1)}%`);

  // Sprites that dock in place fill the holes, so agreement must rise. A set of
  // product shots pastes parts over intact bodywork and drives it down.
  const matched = unregistered === 0 && withSprites > baseOnly && withSprites > 0.8;

  console.log(
    `\n${matched ? "MATCHED" : "NOT MATCHED"} — ` +
      (matched
        ? "the set docks at 0,0 with no calibration."
        : unregistered > 0
          ? `${unregistered} of ${layers.length} sprite(s) make their own region worse, so they are ` +
            `product shots rather than in-place isolations.\nSee docs/landing-hero-sprite-brief.md ` +
            `for exactly what to ask Fable 5 for.`
          : "the sprites do not reconstruct the source well enough to dock without calibration."),
  );
  if (!matched) process.exitCode = 1;
}

await main();
