/**
 * Landing render pipeline — masterPlan.md PHASE 9 / P9.S3, fableTasks.md §5 · §8.
 *
 * Reads the git-ignored masters in `landing-src/` and writes the committed,
 * pre-optimized outputs into `apps/web/public/landing/`. Run by hand whenever
 * an asset changes — deliberately NOT a build step, so CI stays fast and the
 * shipped bytes stay reviewable in the diff.
 *
 *   node scripts/optimize-landing.mjs            # everything
 *   node scripts/optimize-landing.mjs --skip-video
 *   node scripts/optimize-landing.mjs --clean    # wipe the output dir first
 *
 * Provenance, contents and usage rules for every source file:
 * docs/landing-assets.md.
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "landing-src");
const OUT = path.join(ROOT, "apps", "web", "public", "landing");
const MANIFEST = path.join(ROOT, "apps", "web", "lib", "landing-assets.json");

// Breakpoints match the render sizes the route will actually request. Never
// upscale: a width above the source is dropped rather than interpolated.
const CUTOUT_WIDTHS = [480, 768, 1024, 1440];
const HERO_WIDTHS = [480, 768, 1024, 1440];
const PLATE_WIDTHS = [480, 768, 1024, 1376];
const POSTER_WIDTHS = [768, 1024, 1440];

const AVIF = { quality: 55, effort: 6 };
const WEBP = { quality: 72, effort: 5 };

// Only these two clips ship on the route (fableTasks §3.3 / D3); 1 and 3 stay
// in `landing-src/` as marketing material and are never encoded into git.
const SHIPPED_CLIPS = ["chapter-2", "chapter-4"];
const VIDEO_HEIGHT = 1080;
const VIDEO_CRF = 25;

// The plates and clips were composed for LTR — subject in the end-side
// two-thirds, empty third on the start side. Persian is RTL, so the shipped
// default is the horizontally mirrored frame (fableTasks §3.3, owner-approved).
// Cutouts are isolated subjects with no framing to mirror.
const MIRRORED = { cutouts: false, hero: false, plates: true, video: true };

// Trimming is opt-in per group and must stay that way. The P9.S2 cutouts are
// positioned by heroLayout.ts as 2048² frames with the subject centred inside
// transparent padding — trimming those moves every part on the shipped hero.
// The P9.S5 hero layers are the opposite case: fableTasks §3.2 needs tight
// boxes so that a dock coordinate means something.
const TRIMMED = { cutouts: false, hero: true, plates: false };

// Fully transparent, threshold 0: keep every pixel that is not perfectly clear,
// including the sub-0.2% antialiased halo. Anything looser shaves a pixel off
// the box and the recorded trim offset stops matching the master. Written as
// channels rather than a hex string -- this is an alpha sentinel for sharp, not
// a colour anyone renders, and the repo bans hex literals outside tokens.css.
const TRIM_BACKGROUND = { r: 0, g: 0, b: 0, alpha: 0 };

const args = new Set(process.argv.slice(2));
const skipVideo = args.has("--skip-video");
const clean = args.has("--clean");

/** Winget puts its shims in a folder some shells do not inherit — fall back. */
function resolveFfmpeg() {
  const candidates = [];
  if (process.env.FFMPEG_DIR) candidates.push(process.env.FFMPEG_DIR);
  candidates.push(null); // bare name, resolved through PATH
  const local = process.env.LOCALAPPDATA;
  if (local) {
    candidates.push(
      path.join(
        local,
        "Microsoft/WinGet/Packages",
        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "ffmpeg-9.0-full_build/bin",
      ),
    );
  }
  for (const dir of candidates) {
    const bin = dir ? path.join(dir, "ffmpeg") : "ffmpeg";
    const probe = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  return null;
}

function run(bin, argv) {
  const result = spawnSync(bin, argv, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${path.basename(bin)} failed:\n${result.stderr ?? result.error}`);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function sizeOf(file) {
  return (await stat(file)).size;
}

/**
 * The bytes every variant is resized from, plus the dimensions those variants
 * must be described by. When a group trims, `sharp().metadata()` on the source
 * reports the untrimmed canvas — the wrong size — so the trimmed buffer's own
 * `info` is what the manifest records.
 */
async function loadSource(source, trim) {
  const meta = await sharp(source).metadata();
  if (!trim) {
    return {
      buffer: source,
      width: meta.width,
      height: meta.height,
      hasAlpha: Boolean(meta.hasAlpha),
      trim: null,
    };
  }
  const { data, info } = await sharp(source)
    .trim({ background: TRIM_BACKGROUND, threshold: 0 })
    .toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    hasAlpha: Boolean(info.hasAlpha),
    // sharp reports the offsets negated — what it would take to put the crop
    // back. Callers want the crop's position IN the master, so flip them.
    trim: {
      canvas: { width: meta.width, height: meta.height },
      left: -info.trimOffsetLeft,
      top: -info.trimOffsetTop,
    },
  };
}

/**
 * Never upscale — a rung above the source is dropped rather than interpolated,
 * which is why the plates stop at 1376. A trimmed source lands wherever the art
 * lands (510px to 864px for the P9.S5 hero set), so it also contributes its own
 * width as the top rung: the ladder can then never come back empty, and the
 * largest candidate is the master's real resolution rather than a rung below
 * it. A stock rung within 10% of that native width resolves no extra detail and
 * costs two more committed files, so it goes.
 */
function resolveWidths(widths, sourceWidth, nativeRung) {
  const ceiling = nativeRung ? sourceWidth * 0.9 : sourceWidth;
  const ladder = widths.filter((width) => width <= ceiling);
  if (nativeRung) ladder.push(sourceWidth);
  if (ladder.length === 0) {
    throw new Error(`source is narrower than every breakpoint (${sourceWidth}px)`);
  }
  return ladder;
}

/**
 * One source image becomes AVIF + WebP at every width it can serve without
 * upscaling. Alpha survives for cutouts and hero layers; sharp strips metadata
 * by default, so no EXIF or embedded profile rides along.
 */
async function emitResponsive({ source, outDir, name, widths, mirror, trim = false }) {
  const master = await loadSource(source, trim);
  const usable = resolveWidths(widths, master.width, trim);

  const variants = [];
  for (const width of usable) {
    let pipeline = sharp(master.buffer).resize({ width, withoutEnlargement: true });
    if (mirror) pipeline = pipeline.flop();
    const avif = await pipeline.clone().avif(AVIF).toBuffer();
    const webp = await pipeline.clone().webp(WEBP).toBuffer();
    await writeFile(path.join(outDir, `${name}-${width}.avif`), avif);
    await writeFile(path.join(outDir, `${name}-${width}.webp`), webp);
    variants.push({
      width,
      height: Math.round((master.height / master.width) * width),
      avif: avif.length,
      webp: webp.length,
    });
  }
  return {
    name,
    intrinsic: { width: master.width, height: master.height },
    hasAlpha: master.hasAlpha,
    mirrored: Boolean(mirror),
    // `null` for untrimmed groups, so all four groups share one manifest shape.
    trim: master.trim,
    variants,
  };
}

async function emitGroup({ group, widths }) {
  const srcDir = path.join(SRC, group);
  const outDir = path.join(OUT, group);
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(srcDir)).filter((file) => file.endsWith(".png")).sort();

  const entries = [];
  for (const file of files) {
    const name = path.basename(file, ".png");
    const entry = await emitResponsive({
      source: path.join(srcDir, file),
      outDir,
      name,
      widths,
      mirror: MIRRORED[group],
      trim: TRIMMED[group],
    });
    const largest = entry.variants.at(-1);
    console.log(
      `  ${name.padEnd(16)} ${entry.variants.length} widths  largest ${largest.width}w: ` +
        `${formatBytes(largest.avif)} avif / ${formatBytes(largest.webp)} webp`,
    );
    entries.push(entry);
  }
  return entries;
}

/**
 * Re-encode to a mirrored, audio-free 1080p H.264 with the moov atom up front,
 * then lift its first frame as the poster set. Nothing autoplays with sound and
 * nothing below 1024px fetches these bytes (fableTasks D3) — the poster is what
 * mobile and reduced-motion actually see.
 */
async function emitVideo(ffmpeg) {
  const outDir = path.join(OUT, "video");
  await mkdir(outDir, { recursive: true });

  const entries = [];
  for (const clip of SHIPPED_CLIPS) {
    const source = path.join(SRC, "video", `${clip}.mp4`);
    const target = path.join(outDir, `${clip}.mp4`);
    run(ffmpeg, [
      "-y",
      "-loglevel",
      "error",
      "-i",
      source,
      "-vf",
      `${MIRRORED.video ? "hflip," : ""}scale=-2:${VIDEO_HEIGHT}`,
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-crf",
      String(VIDEO_CRF),
      "-preset",
      "slow",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      target,
    ]);

    // The poster comes off the encoded file, so it is mirrored exactly like
    // frame 1 of what the viewer sees — no second chance to get the flip wrong.
    const framePng = path.join(outDir, `${clip}-frame.png`);
    run(ffmpeg, ["-y", "-loglevel", "error", "-i", target, "-frames:v", "1", framePng]);
    const poster = await emitResponsive({
      source: framePng,
      outDir,
      name: `${clip}-poster`,
      widths: POSTER_WIDTHS,
      mirror: false,
    });
    await unlink(framePng);

    const bytes = await sizeOf(target);
    console.log(
      `  ${clip.padEnd(16)} ${formatBytes(bytes)} mp4 (1080p, muted, faststart) + ` +
        `${poster.variants.length} poster widths`,
    );
    entries.push({ name: clip, mp4: { bytes }, poster });
  }
  return entries;
}

/**
 * Video entries from the previous run, so a --skip-video pass does not drop the
 * posters out of the index. Entries written before the hero group existed have
 * no `trim` key; fill it in so every asset in the manifest has one shape and the
 * reader never has to special-case an old file.
 */
async function carriedVideo() {
  const previous = JSON.parse(await readFile(MANIFEST, "utf8")).video ?? [];
  return previous.map((clip) => ({
    ...clip,
    poster: { trim: null, ...clip.poster },
  }));
}

async function dirSize(dir) {
  let total = 0;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    total += item.isDirectory() ? await dirSize(full) : await sizeOf(full);
  }
  return total;
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(
      `No masters at ${path.relative(ROOT, SRC)}. They are git-ignored by design — ` +
        `see docs/landing-assets.md.`,
    );
    process.exitCode = 1;
    return;
  }
  if (clean) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  console.log("cutouts (transparent part renders, unmirrored):");
  const cutouts = await emitGroup({ group: "cutouts", widths: CUTOUT_WIDTHS });

  console.log("hero (stripped base + docked sprites, trimmed to bounding box):");
  const hero = await emitGroup({ group: "hero", widths: HERO_WIDTHS });

  console.log("plates (atmosphere, mirrored for RTL):");
  const plates = await emitGroup({ group: "plates", widths: PLATE_WIDTHS });

  // The manifest is the srcset source of truth, so a run that writes `video: []`
  // would silently 404 every poster. Carry the previous run's entries forward —
  // unless --clean just deleted the files they name, in which case the honest
  // answer is an empty group.
  let video = !clean && existsSync(MANIFEST) ? await carriedVideo() : [];
  const ffmpeg = skipVideo ? null : resolveFfmpeg();
  if (skipVideo) {
    console.log("video: skipped (--skip-video)");
  } else if (!ffmpeg) {
    console.log(
      "video: SKIPPED — ffmpeg not found. It is a local tool, not a repo dependency\n" +
        "       (masterPlan PHASE 9 amendment). Install it, or set FFMPEG_DIR, and re-run.",
    );
  } else {
    console.log("video (mirrored for RTL, audio stripped):");
    video = await emitVideo(ffmpeg);
  }

  await writeFile(
    MANIFEST,
    `${JSON.stringify({ cutouts, hero, plates, video }, null, 2)}\n`,
    "utf8",
  );

  const total = await dirSize(OUT);
  console.log(`\ncommitted landing payload: ${formatBytes(total)} in ${path.relative(ROOT, OUT)}`);
  console.log(`index written to ${path.relative(ROOT, MANIFEST)}`);
}

await main();
