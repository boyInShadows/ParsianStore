import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { CATALOG_SYSTEM_CODES } from "schemas";

import { CHAPTER_RANGE, HERO_CAR, HERO_PARTS } from "./heroLayout.js";
import { CUTOUT_WIDTHS } from "../../../lib/landing-image.js";

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

describe("CUTOUT_WIDTHS", () => {
  it("names only widths the pipeline actually emitted", () => {
    // LandingImage builds its srcset straight from this ladder, so a width
    // listed here that the pipeline never wrote becomes a 404 in a srcset --
    // silent, because the browser just picks another candidate.
    for (const width of CUTOUT_WIDTHS) {
      const file = path.join(PUBLIC_LANDING, "cutouts", `car-${width}.avif`);
      expect(existsSync(file), `car-${width}.avif`).toBe(true);
    }
  });

  it("is ordered smallest first, so srcset candidates ascend", () => {
    expect([...CUTOUT_WIDTHS]).toEqual([...CUTOUT_WIDTHS].sort((a, b) => a - b));
  });
});
