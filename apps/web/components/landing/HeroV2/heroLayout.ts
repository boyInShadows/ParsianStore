import type { CatalogSystemCode } from "schemas";

/**
 * The hero's exploded diagram, expressed as data.
 *
 * Positions are percentages of the stage box, and every layer is centered on
 * its point -- the renders are 2048² frames with the subject centered and
 * generous transparent padding (measured at P9.S3), so a center point plus a
 * width is the whole placement.
 *
 * `chapter` groups the parts into the three separation beats the scroll drives:
 * 1 = front, 2 = engine, 3 = body.
 */
export type HeroPart = {
  /** File base name under `/landing/cutouts/`, no width or extension tail. */
  name: string;
  chapter: 1 | 2 | 3;
  /** Center of the layer, as a percentage of the stage. */
  startPct: number;
  topPct: number;
  /** Layer width, as a percentage of the stage. */
  widthPct: number;
  /**
   * The catalog system this render genuinely depicts, or `null` when it is
   * diagram artwork only.
   *
   * Only four of the nine part renders map to a system honestly: a piston is
   * engine, an alternator is electrical, an air filter is filters-and-fluids,
   * a hood is body. The remaining five are body panels and front-end trim with
   * no distinct system of their own, and there is no render at all for
   * transmission, suspension, brakes, cooling, exhaust or interior. Labelling a
   * windshield "گیربکس" to fill the diagram would be exactly the fabricated
   * data this project forbids -- so unmapped parts carry no label, and every
   * system reaches its destination through the index rail beside the stage
   * instead.
   */
  system: CatalogSystemCode | null;
};

export const HERO_PARTS: readonly HeroPart[] = [
  { name: "windshield", chapter: 3, startPct: 26, topPct: 11, widthPct: 24, system: null },
  { name: "piston", chapter: 2, startPct: 46, topPct: 9, widthPct: 9, system: "SYS-01" },
  { name: "alternator", chapter: 2, startPct: 63, topPct: 15, widthPct: 15, system: "SYS-05" },
  { name: "headlight", chapter: 1, startPct: 12, topPct: 28, widthPct: 15, system: null },
  { name: "air-filter", chapter: 2, startPct: 85, topPct: 32, widthPct: 18, system: "SYS-10" },
  { name: "hood", chapter: 3, startPct: 84, topPct: 71, widthPct: 25, system: "SYS-06" },
  { name: "bumper", chapter: 1, startPct: 15, topPct: 75, widthPct: 29, system: null },
  { name: "fender", chapter: 3, startPct: 39, topPct: 89, widthPct: 21, system: null },
  { name: "door", chapter: 3, startPct: 63, topPct: 88, widthPct: 19, system: null },
];

/** The car sits at the centre; every part separates outward from this point. */
export const HERO_CAR = { startPct: 50, topPct: 50, widthPct: 58 } as const;

/**
 * Scroll ranges per chapter, as a fraction of the hero's own scroll distance.
 * They overlap so the sequence reads as one continuous separation rather than
 * three discrete steps.
 */
export const CHAPTER_RANGE: Record<HeroPart["chapter"], readonly [number, number]> = {
  1: [0.0, 0.45],
  2: [0.15, 0.7],
  3: [0.35, 0.95],
};

/** How far into the car a part is tucked before it separates. */
export const COLLAPSED_SCALE = 0.55;
export const COLLAPSED_OPACITY = 0.15;
