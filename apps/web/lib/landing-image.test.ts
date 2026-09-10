import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import manifest from "./landing-assets.json";
import { LANDING_ASSETS, landingAsset, landingFallback, landingSrcSet } from "./landing-image.js";

const PUBLIC_LANDING = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/landing");

type Variant = { width: number; height: number; avif: number; webp: number };
type Entry = {
  name: string;
  intrinsic: { width: number; height: number };
  hasAlpha: boolean;
  mirrored: boolean;
  trim: { canvas: { width: number; height: number }; left: number; top: number } | null;
  variants: Variant[];
};

/** Every entry paired with the public directory its files live in. */
function allEntries(): { group: string; entry: Entry }[] {
  return [
    ...manifest.cutouts.map((entry) => ({ group: "cutouts", entry: entry as Entry })),
    ...manifest.hero.map((entry) => ({ group: "hero", entry: entry as Entry })),
    ...manifest["hero-parts"].map((entry) => ({ group: "hero-parts", entry: entry as Entry })),
    ...manifest.plates.map((entry) => ({ group: "plates", entry: entry as Entry })),
    ...manifest.video.map((clip) => ({ group: "video", entry: clip.poster as Entry })),
  ];
}

const isPositiveInt = (value: unknown) => Number.isInteger(value) && (value as number) > 0;

describe("landing-assets.json", () => {
  it("matches the shape the pipeline promises", () => {
    // A hand-edit or a partial pipeline run is otherwise invisible until a
    // component throws at render time, which on a Server Component means the
    // whole section disappears rather than one image breaking.
    expect(Object.keys(manifest).sort()).toEqual([
      "cutouts",
      "hero",
      "hero-parts",
      "plates",
      "video",
    ]);
    for (const { entry } of allEntries()) {
      expect(entry.name.length, "name").toBeGreaterThan(0);
      expect(isPositiveInt(entry.intrinsic.width), `${entry.name} intrinsic.width`).toBe(true);
      expect(isPositiveInt(entry.intrinsic.height), `${entry.name} intrinsic.height`).toBe(true);
      expect(typeof entry.hasAlpha, `${entry.name} hasAlpha`).toBe("boolean");
      expect(typeof entry.mirrored, `${entry.name} mirrored`).toBe("boolean");
      // Present on every group, `null` where the pipeline does not trim -- one
      // shape for all five groups keeps the reader free of special cases.
      expect("trim" in entry, `${entry.name} trim`).toBe(true);
      if (entry.trim !== null) {
        expect(isPositiveInt(entry.trim.canvas.width), `${entry.name} canvas`).toBe(true);
        expect(entry.trim.left, `${entry.name} left`).toBeGreaterThanOrEqual(0);
        expect(entry.trim.top, `${entry.name} top`).toBeGreaterThanOrEqual(0);
      }
      expect(entry.variants.length, `${entry.name} variants`).toBeGreaterThan(0);
      for (const variant of entry.variants) {
        for (const key of ["width", "height", "avif", "webp"] as const) {
          expect(isPositiveInt(variant[key]), `${entry.name} ${key}`).toBe(true);
        }
      }
    }
  });

  it("names only files that are actually on disk, in both formats", () => {
    // This is the assertion that makes "a srcset can never 404" true by
    // construction, for cutouts, hero layers, plates and posters alike.
    for (const { group, entry } of allEntries()) {
      for (const variant of entry.variants) {
        for (const format of ["avif", "webp"]) {
          const file = path.join(PUBLIC_LANDING, group, `${entry.name}-${variant.width}.${format}`);
          expect(existsSync(file), path.relative(PUBLIC_LANDING, file)).toBe(true);
        }
      }
    }
  });

  it("accounts for every committed avif, so a rename leaves no orphans", () => {
    const named = new Set(
      allEntries().flatMap(({ group, entry }) =>
        entry.variants.map((variant) => `${group}/${entry.name}-${variant.width}.avif`),
      ),
    );
    for (const group of ["cutouts", "hero", "plates", "video"]) {
      const dir = path.join(PUBLIC_LANDING, group);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).filter((name) => name.endsWith(".avif"))) {
        expect(named, `${group}/${file}`).toContain(`${group}/${file}`);
      }
    }
  });

  it("never upscales, and lists widths smallest first", () => {
    for (const { entry } of allEntries()) {
      const widths = entry.variants.map((variant) => variant.width);
      expect(widths, entry.name).toEqual([...widths].sort((a, b) => a - b));
      expect(widths.at(-1), entry.name).toBeLessThanOrEqual(entry.intrinsic.width);
    }
  });
});

describe("landingAsset", () => {
  it("resolves every asset the manifest carries", () => {
    for (const { group, entry } of allEntries()) {
      expect(() => landingAsset(`/landing/${group}/${entry.name}`)).not.toThrow();
    }
    expect(LANDING_ASSETS.size).toBe(allEntries().length);
  });

  it("points the caller at the pipeline instead of failing silently", () => {
    expect(() => landingAsset("/landing/hero/sprite-spoiler")).toThrow(/pnpm optimize:landing/);
  });

  it("builds a srcset whose largest candidate is the fallback", () => {
    const asset = landingAsset("/landing/hero/car-stripped");
    expect(landingSrcSet(asset)).toBe(
      asset.widths.map((width) => `${asset.src}-${width}.avif ${width}w`).join(", "),
    );
    expect(landingFallback(asset)).toBe(`${asset.src}-${asset.widths.at(-1)}.avif`);
  });
});

/**
 * P12.S11, verifying defect 5 rather than assuming it.
 *
 * The clips were composed for LTR -- subject in the end-side two-thirds, empty
 * third on the start side -- so the shipped file is horizontally flipped for a
 * Persian page (fableTasks §3.3). The report was that the un-mirrored variant
 * might be the one referenced.
 *
 * It is not. Verified against the bytes, not the config: a frame from each
 * shipped mp4, flipped, is pixel-identical to the same frame of its source in
 * `landing-src/video/`, for both clips. That check needs ffmpeg, so what stays
 * behind as a permanent guard is this: the manifest has to keep saying the
 * clips are mirrored, which fails the moment someone flips `MIRRORED.video` in
 * `scripts/optimize-landing.mjs` and re-runs the pipeline.
 */
describe("the landing clips ship mirrored for RTL", () => {
  it("records the flip on the clip itself, for every clip", () => {
    const clips = manifest.video ?? [];
    expect(clips.length, "no clips in the manifest").toBeGreaterThan(0);
    for (const clip of clips) {
      expect(clip.mp4.mirrored, `${clip.name} is not marked mirrored`).toBe(true);
    }
  });

  it("does not read the flip off the poster, which cannot know it", () => {
    // The poster is cut from the already-flipped encode, so sharp does no
    // flopping and honestly records `mirrored: false`. True of what sharp did,
    // and the opposite of what a reader wants -- which is exactly why the flag
    // above exists on the clip. Pinned so nobody "fixes" the poster's flag.
    for (const clip of manifest.video ?? []) {
      expect(clip.poster.mirrored, `${clip.name} poster`).toBe(false);
    }
  });
});
