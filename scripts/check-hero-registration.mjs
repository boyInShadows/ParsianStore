/**
 * Hero sprite registration check — docs/landing-hero-sprite-brief.md.
 *
 * A matched hero set has one property: the stripped base plus all seven part
 * sprites, stacked at 0,0 with no transform, reconstruct the source render.
 * This script measures that, so "matched" is a number rather than an opinion.
 *
 *   node scripts/check-hero-registration.mjs landing-src/hero/source-car.png
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
const HERO = path.join(ROOT, "landing-src", "hero");
const BASE = "car-stripped.png";

// Per-pixel channel delta below which two renders count as the same surface.
// Generative edits re-shade slightly even when geometry holds; 70 is the
// threshold that separated real part removals from codec noise on batch 1.
const SAME_SURFACE = 70;

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

/** Fraction of pixels that read as the same surface, optionally inside a box. */
function agreement(a, b, box = null) {
  const { width, channels } = a;
  let considered = 0,
    same = 0;
  const x0 = box ? box.x : 0;
  const y0 = box ? box.y : 0;
  const x1 = box ? box.x + box.w : width;
  const y1 = box ? box.y + box.h : a.height;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels;
      if (a.data[i + 3] < 128 && b.data[i + 3] < 128) continue;
      considered++;
      const delta = Math.max(
        Math.abs(a.data[i] - b.data[i]),
        Math.abs(a.data[i + 1] - b.data[i + 1]),
        Math.abs(a.data[i + 2] - b.data[i + 2]),
        Math.abs(a.data[i + 3] - b.data[i + 3]),
      );
      if (delta <= SAME_SURFACE) same++;
    }
  }
  return considered === 0 ? 0 : same / considered;
}

async function main() {
  const sourceArg = process.argv[2];
  if (!sourceArg) {
    console.error("usage: node scripts/check-hero-registration.mjs <source-render.png>");
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
    // The only question that matters per sprite: dropped onto the base at 0,0,
    // does the region it covers get CLOSER to the source, or further away? A
    // part isolated in place fills its own hole and improves; a product shot
    // pastes itself over intact bodywork and makes things worse.
    const before = agreement(base, src, box);
    const after = agreement(composite(base, [layer]), src, box);
    const registered = after > before;
    if (!registered) unregistered++;
    console.log(
      `  ${path.basename(file, ".png").padEnd(20)}` +
        `${String(box.x).padStart(4)},${String(box.y).padEnd(5)} ${box.w}x${box.h}`.padEnd(23) +
        `${(before * 100).toFixed(0)}% -> ${(after * 100).toFixed(0)}%`.padStart(16) +
        (registered ? "     docks" : "     NOT REGISTERED"),
    );
    layers.push(layer);
  }

  const stacked = composite(base, layers);
  const baseOnly = agreement(base, src);
  const withSprites = agreement(stacked, src);

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
