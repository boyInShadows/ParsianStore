/**
 * The hero's docked-sprite car, expressed as data (fableTasks §3.2).
 *
 * One stripped base plus seven sprites that sit in their home positions at
 * rest, so the first frame is a *complete* car rather than a collapsed pile.
 * Scroll undocks them (P9.S5 part 3); this module is only where each layer
 * sits when it is docked.
 *
 * ## Why a canvas, not stage percentages
 *
 * Every layer was isolated from the same 1024² master frame, and
 * `scripts/optimize-landing.mjs` trims each one to its bounding box while
 * recording where that box sat in the master (`trim.left` / `trim.top` in
 * `landing-assets.json`). Drawing a layer at its recorded trim offset therefore
 * reproduces the master exactly -- that is the registration contract §3.2 asks
 * for, preserved through the trim rather than lost to it.
 *
 * So the stage hosts a square *frame* standing for the 1024² canvas, every
 * layer is placed by its own trim box, and the numbers below are only the
 * **delta from that native registration**. A layer with `NATIVE` dock is one
 * the render already put in the right place; a non-zero dock is a measured
 * correction, not a guess at an absolute position.
 *
 * ## Why some layers need a correction at all
 *
 * The batch is not uniform. Bumper, grille, fender and door came back as true
 * in-place isolations and dock at native registration with nothing to tune.
 * Hood, windshield and the headlights came back as centred product shots --
 * the same part, re-framed -- so they carry a scale, an offset, and (for the
 * hood) a small `rotateZ` to sit on the car. Those were calibrated against the
 * base by measuring the rendered composite, not by eye alone.
 */

/** The master frame every hero layer was isolated from, in pixels. */
export const HERO_CANVAS = 1024;

/**
 * How much of the stage's width the canvas frame spans.
 *
 * The car occupies 823 of the canvas's 1024 columns and only 367 of its 1024
 * rows, so the frame is mostly transparent margin above and below the vehicle.
 * At the v1 hero's 72% the car came out 58% of the stage wide and barely a
 * third of it tall, floating in a band of empty graphite; 92% spends that
 * margin on the car instead, leaving roughly a quarter of the stage's height
 * clear at each end for part 3's parts to undock into.
 */
export const HERO_FRAME_WIDTH_PCT = 92;

/**
 * The stage's shared camera, in container-query width units so the 3D read
 * stays identical at every breakpoint. A fixed pixel `perspective` would make
 * the same rotation look flat on a phone and extreme on a desktop.
 *
 * It lives on the frame, never on an individual layer: `perspective()` written
 * per element gives each sprite its own vanishing point, and seven vanishing
 * points do not read as one object.
 */
export const HERO_PERSPECTIVE_CQW = 140;

/**
 * A layer's placement relative to its own native registration.
 *
 * `dx`/`dy` are canvas pixels. `scale` is uniform and applied about the
 * layer's own box centre, so changing it never drags the part sideways.
 * Rotations are degrees under the frame's shared camera.
 */
export type HeroDock = {
  readonly dx: number;
  readonly dy: number;
  readonly scale: number;
  readonly rotateX?: number;
  readonly rotateY?: number;
  readonly rotateZ?: number;
};

/**
 * `clip-path: inset()` percentages, for a layer that must show only part of
 * its asset.
 *
 * Physical sides on purpose. `inset()` has no logical form, and the stage is
 * pinned to `direction: ltr` because the car is an object rather than text --
 * so "right" here means the same edge of the same render in both locales,
 * which is exactly what a dock coordinate needs. This is the one place the
 * project's logical-properties rule (CLAUDE.md §6) has nothing to say.
 */
export type HeroClip = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

export type HeroLayer = {
  /** Unique key; also the motion key when part 3 drives the undock. */
  readonly id: string;
  /** Manifest name under `/landing/hero/`. */
  readonly asset: string;
  /** Which separation beat this layer leaves on: 1 = front, 2 = engine, 3 = body. */
  readonly chapter: 1 | 2 | 3;
  readonly dock: HeroDock;
  readonly clip?: HeroClip;
};

/** The layer that needed no calibration: drawn exactly where it was rendered. */
const NATIVE: HeroDock = { dx: 0, dy: 0, scale: 1 };

/** The stripped body every sprite docks onto. Always native, never undocks. */
export const HERO_BASE_ASSET = "car-stripped";

/**
 * Painted in order, so later entries sit in front.
 *
 * The sequence is the car's own depth from the inside out: hood and windshield
 * first, then the panels that overlap them (fender over the hood's near edge,
 * door over the fender's trailing edge), then the front-end trim, and the
 * bumper last because it crosses in front of everything on the nose.
 */
export const HERO_LAYERS: readonly HeroLayer[] = [
  // Product shot: scaled to the bay and turned a few degrees so its ridge runs
  // along the car's, rather than across it.
  {
    id: "hood",
    asset: "sprite-hood",
    chapter: 2,
    dock: { dx: -130, dy: -95, scale: 0.66, rotateZ: -4 },
  },
  // Product shot: the pane is rendered at nearly three times the aperture.
  {
    id: "windshield",
    asset: "sprite-windshield",
    chapter: 3,
    dock: { dx: 28, dy: -111, scale: 0.37 },
  },
  { id: "fender", asset: "sprite-fender", chapter: 3, dock: NATIVE },
  { id: "door", asset: "sprite-door", chapter: 3, dock: NATIVE },
  { id: "grille", asset: "sprite-grille", chapter: 1, dock: NATIVE },
  // One render, two lamps, two sockets -- and the sockets are 280 canvas
  // pixels apart at ~50 across while the render's pair is 380 apart at 303.
  // No single scale seats both, so each socket gets its own instance of the
  // same file clipped to one lamp. Same download, two placements.
  {
    id: "lamp-far",
    asset: "sprite-headlights",
    chapter: 1,
    dock: { dx: -354.4, dy: -12.8, scale: 0.1551 },
    clip: { top: 0, right: 55.3, bottom: 1, left: 0.15 },
  },
  {
    id: "lamp-near",
    asset: "sprite-headlights",
    chapter: 1,
    dock: { dx: -142.2, dy: 7.2, scale: 0.1848 },
    clip: { top: 0, right: 0.15, bottom: 0.65, left: 55.4 },
  },
  { id: "bumper", asset: "sprite-bumper", chapter: 1, dock: NATIVE },
];

/**
 * Scroll ranges per chapter, as a fraction of the hero's own scroll distance.
 * They overlap so the separation reads as one continuous motion rather than
 * three discrete steps. Part 3 drives the undock from these; part 2 ships the
 * docked state only.
 */
export const CHAPTER_RANGE: Record<HeroLayer["chapter"], readonly [number, number]> = {
  1: [0.0, 0.45],
  2: [0.15, 0.7],
  3: [0.35, 0.95],
};
