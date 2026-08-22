import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { CATALOG_SYSTEM_CODES } from "schemas";

import { CHAPTER_RANGE, HERO_CAR, HERO_PARTS } from "./heroLayout.js";
import { landingAsset } from "../../../lib/landing-image.js";

const PUBLIC_LANDING = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../public/landing",
);

describe("HERO_PARTS", () => {
  it("only references cutouts the pipeline actually emitted", () => {
    // There is no grille render (verified P9.S2) -- a layout that reserves a
    // slot for a part nobody generated renders a broken image, not a gap.
    for (const part of HERO_PARTS) {
      const file = path.join(PUBLIC_LANDING, "cutouts", `${part.name}-1440.avif`);
      expect(existsSync(file), part.name).toBe(true);
    }
  });

  it("keeps every layer inside the stage", () => {
    for (const part of [...HERO_PARTS, HERO_CAR]) {
      expect(part.startPct).toBeGreaterThanOrEqual(0);
      expect(part.startPct).toBeLessThanOrEqual(100);
      expect(part.topPct).toBeGreaterThanOrEqual(0);
      expect(part.topPct).toBeLessThanOrEqual(100);
      expect(part.widthPct).toBeGreaterThan(0);
    }
  });

  it("never labels two parts with the same system", () => {
    const mapped = HERO_PARTS.map((part) => part.system).filter((code) => code !== null);
    expect(new Set(mapped).size).toBe(mapped.length);
  });

  it("only claims systems that exist in the catalog", () => {
    for (const part of HERO_PARTS) {
      if (part.system === null) continue;
      expect(CATALOG_SYSTEM_CODES).toContain(part.system);
    }
  });

  it("leaves a part unlabeled rather than inventing a system for it", () => {
    // The honest mapping is small on purpose: piston/alternator/air-filter/hood
    // depict a system, the other five renders are body panels and front-end
    // trim that do not. The index rail carries the rest of the destinations.
    const labeled = HERO_PARTS.filter((part) => part.system !== null).map((part) => part.name);
    expect(labeled.sort()).toEqual(["air-filter", "alternator", "hood", "piston"]);
  });

  it("spreads the parts across all three separation chapters", () => {
    const chapters = new Set(HERO_PARTS.map((part) => part.chapter));
    expect([...chapters].sort()).toEqual([1, 2, 3]);
  });
});

describe("CHAPTER_RANGE", () => {
  it("stays inside the hero's own scroll distance and moves forward", () => {
    for (const [from, to] of Object.values(CHAPTER_RANGE)) {
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThanOrEqual(1);
      expect(to).toBeGreaterThan(from);
    }
  });

  it("overlaps the chapters so the separation reads as one sequence", () => {
    expect(CHAPTER_RANGE[2][0]).toBeLessThan(CHAPTER_RANGE[1][1]);
    expect(CHAPTER_RANGE[3][0]).toBeLessThan(CHAPTER_RANGE[2][1]);
  });
});

/**
 * The P9.S5 docked-sprite set: one stripped base plus the seven sprites that
 * dock onto it (fableTasks §3.2). `heroLayout.ts` binds to these in S5b; these
 * assertions guard the inventory the pipeline delivered in S5a.
 */
const HERO_SPRITES = [
  "sprite-bumper",
  "sprite-door",
  "sprite-fender",
  "sprite-grille",
  "sprite-headlight",
  "sprite-hood",
  "sprite-windshield",
] as const;

const SPRITE_BUDGET_BYTES = 120 * 1024;
const BASE_BUDGET_BYTES = 90 * 1024;

function topRungAvif(src: string): number {
  const asset = landingAsset(src);
  const largest = asset.widths.at(-1);
  const file = path.join(PUBLIC_LANDING, src.replace("/landing/", ""));
  return statSync(`${file}-${largest}.avif`).size;
}

describe("hero layer assets", () => {
  it("ships the stripped base and all seven sprites", () => {
    // The honest-inventory test. Its predecessor asserted "there is no grille
    // render", which was true of the standalone cutouts and is now false of the
    // hero group -- sprite-grille is one of the seven.
    for (const name of ["car-stripped", ...HERO_SPRITES]) {
      expect(() => landingAsset(`/landing/hero/${name}`), name).not.toThrow();
    }
  });

  it("trims every hero layer to its bounding box", () => {
    // Untrimmed, a sprite floats in a 1024² canvas that is 80% transparent, and
    // a dock coordinate in heroLayout.ts would mean nothing.
    for (const name of ["car-stripped", ...HERO_SPRITES]) {
      const asset = landingAsset(`/landing/hero/${name}`);
      expect(asset.trim, name).not.toBeNull();
      expect(asset.trim!.canvas).toEqual({ width: 1024, height: 1024 });
      expect(asset.intrinsic.width, name).toBeLessThan(asset.trim!.canvas.width);
      expect(asset.trim!.left + asset.intrinsic.width).toBeLessThanOrEqual(
        asset.trim!.canvas.width,
      );
      expect(asset.trim!.top + asset.intrinsic.height).toBeLessThanOrEqual(
        asset.trim!.canvas.height,
      );
    }
  });

  it("leaves the standalone cutouts untrimmed", () => {
    // The regression guard for the trap this step walked into: HERO_PARTS
    // positions cutouts by their centre inside a 2048² frame, so a global trim
    // would silently move every part on the shipped hero.
    for (const part of HERO_PARTS) {
      const asset = landingAsset(`/landing/cutouts/${part.name}`);
      expect(asset.trim, part.name).toBeNull();
      expect(asset.intrinsic, part.name).toEqual({ width: 2048, height: 2048 });
    }
  });

  it("holds the fableTasks §3.2 byte budgets", () => {
    expect(topRungAvif("/landing/hero/car-stripped")).toBeLessThanOrEqual(BASE_BUDGET_BYTES);
    const sprites = HERO_SPRITES.reduce(
      (total, name) => total + topRungAvif(`/landing/hero/${name}`),
      0,
    );
    expect(sprites).toBeLessThanOrEqual(SPRITE_BUDGET_BYTES);
  });
});
