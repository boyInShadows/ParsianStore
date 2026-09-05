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

/**
 * How far the part travels away from the car at the peak of its chapter, in
 * canvas pixels, plus how much it grows as it comes toward the viewer.
 *
 * Mostly vertical on purpose. The frame is square and the stage is 16/11, so
 * the canvas rows visible inside the stage run roughly 130..894 -- about 200
 * pixels of clear air above the car and 190 below. Sideways there is far less:
 * the car spans 103..926 of 1024, and a part that keeps going leaves the stage
 * and lands on the copy column beside it.
 */
export type HeroUndock = {
  readonly dx: number;
  readonly dy: number;
  /** Peak scale. Slightly over 1 reads as "toward the viewer", not "bigger". */
  readonly scale: number;
};

export type HeroLayer = {
  /** Unique key; also the motion key that drives the undock. */
  readonly id: string;
  /** Manifest name under `/landing/hero/`. */
  readonly asset: string;
  /** Which separation beat this layer leaves on: 1 = front, 2 = engine, 3 = body. */
  readonly chapter: 1 | 2 | 3;
  readonly dock: HeroDock;
  readonly undock: HeroUndock;
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
  // along the car's, rather than across it. Lifts up and back off its hinge.
  //
  // The offset was wrong until it was measured against the shell rather than
  // judged against the composite. dy -95 put the box at 137,352 -- top 352 is
  // above the shell's own roofline here, so the panel sat over the cowl and the
  // windshield instead of on the bay, leaving the engine visible in front of it
  // and the far corner overhanging the fender. The bay is at rows 389-527, not
  // 352-490. Scale and rotation were right and are unchanged; only dx/dy moved.
  {
    id: "hood",
    asset: "sprite-hood",
    chapter: 2,
    dock: { dx: -155, dy: -58, scale: 0.66, rotateZ: -4 },
    undock: { dx: 40, dy: -175, scale: 1.06 },
  },
  // Product shot: the pane is rendered at nearly three times the aperture.
  {
    id: "windshield",
    asset: "sprite-windshield",
    chapter: 3,
    dock: { dx: 28, dy: -111, scale: 0.37 },
    undock: { dx: 90, dy: -140, scale: 1.06 },
  },
  {
    id: "fender",
    asset: "sprite-fender",
    chapter: 3,
    dock: NATIVE,
    undock: { dx: -40, dy: 180, scale: 1.05 },
  },
  {
    id: "door",
    asset: "sprite-door",
    chapter: 3,
    dock: NATIVE,
    undock: { dx: 120, dy: 90, scale: 1.05 },
  },
  {
    id: "grille",
    asset: "sprite-grille",
    chapter: 1,
    dock: NATIVE,
    undock: { dx: -90, dy: 75, scale: 1.08 },
  },
  // One render, two lamps, two sockets -- and the sockets are 280 canvas
  // pixels apart at ~50 across while the render's pair is 380 apart at 303.
  // No single scale seats both, so each socket gets its own instance of the
  // same file clipped to one lamp. Same download, two placements.
  {
    id: "lamp-far",
    asset: "sprite-headlights",
    chapter: 1,
    dock: { dx: -354.4, dy: -12.8, scale: 0.1551 },
    undock: { dx: -45, dy: -85, scale: 1.12 },
    clip: { top: 0, right: 55.3, bottom: 1, left: 0.15 },
  },
  {
    id: "lamp-near",
    asset: "sprite-headlights",
    chapter: 1,
    dock: { dx: -142.2, dy: 7.2, scale: 0.1848 },
    undock: { dx: 15, dy: -105, scale: 1.12 },
    clip: { top: 0, right: 0.15, bottom: 0.65, left: 55.4 },
  },
  {
    id: "bumper",
    asset: "sprite-bumper",
    chapter: 1,
    dock: NATIVE,
    undock: { dx: -30, dy: 150, scale: 1.05 },
  },
];

/**
 * Where an engine-bay part sits on the canvas.
 *
 * Placed, not registered -- and that is the whole difference between this type
 * and `HeroDock`. A hero sprite was cut out of the car render, so its trim box
 * is a real coordinate in that frame and a dock is only a *correction* to it.
 * An alternator was never anywhere in that render: it is a catalogue product
 * shot, so there is no native position to correct and the only honest thing to
 * write is where it goes.
 *
 * Height rather than scale, for the same reason. `scale` is meaningful against
 * an intrinsic size that came from the car; these three came from 2048² product
 * frames trimmed to wildly different boxes (215x528 for the piston, 497x297 for
 * the air filter), so a shared scale would size them at random. A canvas height
 * says how tall the part stands in the bay, and the width follows from the
 * asset's own aspect ratio, so nothing is ever distorted.
 */
export type HeroPartPlacement = {
  /** Centre of the part on the 1024² canvas. */
  readonly cx: number;
  readonly cy: number;
  /** How tall it stands, in canvas pixels. Width follows the aspect ratio. */
  readonly height: number;
};

export type HeroEnginePart = {
  readonly id: string;
  /** Manifest name under `/landing/hero-parts/`. */
  readonly asset: string;
  readonly place: HeroPartPlacement;
  readonly undock: HeroUndock;
};

/**
 * The engine bay, in canvas pixels: exactly the box the docked hood covers.
 *
 * Derived from the registration rather than eyeballed -- the hood sprite trims
 * to 737x208 at (142, 412) and docks at scale 0.66 with dx -155 / dy -58, which
 * puts its box at 112,389 -> 599,527. Anything the hood is supposed to hide has
 * to sit inside that, and `manifestData.test.ts` checks that every part does.
 *
 * It moved with the hood: the previous box (137,352 -> 624,490) was derived from
 * the hood's own misplacement, so the three parts were "inside the bay" by the
 * test's arithmetic while sitting over the cowl on screen. A derived constant is
 * only as true as what it is derived from.
 */
export const HERO_BAY = { left: 112, top: 389, right: 599, bottom: 527 } as const;

/**
 * The three parts that live under the hood (fableTasks2 §2.1's chapter 2).
 *
 * They are painted between the base and the sprites, so at rest the hood covers
 * them completely and the car still opens as a closed, whole car. Chapter 2
 * lifts the hood up and back, which uncovers them, and they rise out of the bay
 * on the same beat.
 *
 * Sizes are catalogue-legible rather than literally to scale: a real piston in
 * a 490px bay would be a smudge, and the point of the beat is that a visitor
 * can name what they are looking at. They stay small enough to read as bay
 * internals and large enough to be identifiable at 360px.
 *
 * They travel DOWN, and the hood goes up. That was not the first attempt: the
 * obvious reading of "the parts rise" put all three in the band above the car,
 * where the lifted hood already is. Rendered, the alternator was completely
 * behind the hood -- both of them move toward the rear, so they arrive in the
 * same place -- and the other two were pinched into the 38px of clear air
 * between the hood's underside and the bay. The stage's geometry is the reason:
 * the car occupies canvas rows 333-700 of a visible 130-894, so there are two
 * clear bands, and at its peak the hood covers most of the upper one. The lower
 * band is 194px of nothing.
 *
 * So the bay opens in two directions, which is also how a workshop manual draws
 * one: the panel lifts off, the internals displace along an axis, and nothing
 * overlaps anything. The slight fan (air filter forward, alternator back) keeps
 * three parts falling on one beat from reading as a single object with three
 * lumps.
 */
export const HERO_ENGINE_PARTS: readonly HeroEnginePart[] = [
  {
    id: "air-filter",
    asset: "air-filter",
    place: { cx: 260, cy: 468, height: 55 },
    undock: { dx: -30, dy: 340, scale: 1.12 },
  },
  {
    id: "piston",
    asset: "piston",
    place: { cx: 380, cy: 462, height: 105 },
    undock: { dx: 0, dy: 350, scale: 1.12 },
  },
  {
    id: "alternator",
    asset: "alternator",
    place: { cx: 500, cy: 468, height: 78 },
    undock: { dx: 30, dy: 340, scale: 1.12 },
  },
];

/** Every engine part rides chapter 2, with the hood that uncovers them. */
export const HERO_ENGINE_CHAPTER: HeroLayer["chapter"] = 2;

/**
 * Scroll ranges per chapter, as a fraction of the hero's own scroll distance.
 *
 * **Sequential, not overlapping, and each chapter returns to zero before the
 * next opens** (fableTasks §5, P9.S5: "each chapter re-docking before the next
 * begins"). The v1 hero overlapped its ranges because it played one continuous
 * one-way explosion; a docked car wants the opposite. Each group lifts away and
 * settles back, so the composite is legible at every point in the scroll, only
 * one group is ever in the air, and the visitor who scrolls to the bottom is
 * looking at a whole car again rather than a cloud of panels.
 *
 * The gaps between ranges are deliberate rest beats, and the leading 0.02 keeps
 * the very first frame docked so the hero does not appear mid-motion.
 */
export const CHAPTER_RANGE: Record<HeroLayer["chapter"], readonly [number, number]> = {
  1: [0.02, 0.34],
  2: [0.36, 0.66],
  3: [0.68, 0.98],
};

/**
 * The order the parts leave in, and which of them leave together.
 *
 * P12.S6 (defect 2: "the separation is not legible"). Until this existed every
 * layer in a chapter shared one beat, so a chapter was not three parts leaving
 * -- it was one event with three shapes in it, and a visitor could not name what
 * they had just seen. Each slot below now gets its own span inside the chapter.
 *
 * Slots hold ids rather than one id because two things genuinely move together:
 * the headlights are one part rendered as two clipped instances of the same
 * file (`lamp-far` / `lamp-near`), and a car whose two headlights leave at
 * different moments is a car with a fault, not a diagram.
 *
 * The order matches the manifest's rows, so a visitor reading the list top to
 * bottom sees the scene play in the same sequence.
 */
export const CHAPTER_SEQUENCE: Record<HeroLayer["chapter"], readonly (readonly string[])[]> = {
  1: [["lamp-far", "lamp-near"], ["grille"], ["bumper"]],
  2: [["air-filter"], ["piston"], ["alternator"]],
  3: [["door"], ["fender"], ["windshield"]],
};

/**
 * A part that is not in the sequence because it *contains* the sequence.
 *
 * The hood is not one of chapter 2's beats, it is the lid over them. Given a
 * slot like everything else, it opened, closed again, and then the piston and
 * the alternator emerged through a shut bonnet -- which is exactly what the
 * filmstrip showed the first time this step was rendered. The staggering was
 * right and the model was wrong.
 *
 * So a cover opens across `COVER_SWING` at the start of its chapter, stays open
 * while every slot in that chapter plays inside it, and shuts over the same
 * distance at the end.
 */
export const CHAPTER_COVER: Partial<Record<HeroLayer["chapter"], string>> = {
  2: "hood",
};

/**
 * How much of the chapter a cover spends opening, and again closing.
 *
 * Short on purpose: the lid is not the story, what is under it is. It also sets
 * the room the slots get -- they play inside what is left, so a bigger swing
 * buys a more leisurely hood at the cost of the parts it uncovers.
 */
export const COVER_SWING = 0.16;

/**
 * How much of the available run one slot's beat occupies.
 *
 * Below 1 the slots overlap; the remainder is what staggers them, and the two
 * constants are not independent. For no two parts to be held at their peak at
 * once, the offset between slots has to exceed the hold itself:
 *
 *     (1 - BEAT_SPAN) / (slots - 1)  >  BEAT_SPAN * holdWidth
 *
 * 0.62 failed that -- caught by `heroLayout.test.ts`, which is the invariant
 * the whole step is about, so the span came down rather than the test being
 * softened. 0.42 with the hold below clears it comfortably at three slots and
 * still leaves each beat a readable share of the track.
 */
export const BEAT_SPAN = 0.42;

/**
 * Where the part is at its peak, as a fraction of its own beat.
 *
 * Four keyframes, not three: rise, **hold**, fall. The hold is the whole point
 * of the step. A triangle beat reaches its peak for exactly one scroll position,
 * so the part is never actually still and there is no moment to look at it --
 * it is a smear whichever speed you scroll at. Holding it stationary across the
 * middle of its beat is what makes it nameable, and it costs nothing: the part
 * still docks by the end of its span.
 */
export const BEAT_HOLD: readonly [number, number] = [0.32, 0.68];

/** The stretch of a chapter the slots may use: what the cover leaves them. */
function slotRange(chapter: HeroLayer["chapter"]): readonly [number, number] {
  const [from, to] = CHAPTER_RANGE[chapter];
  if (!CHAPTER_COVER[chapter]) return [from, to];
  const swing = (to - from) * COVER_SWING;
  return [from + swing, to - swing];
}

/**
 * The scroll positions of one slot's beat: docked, peak, still at peak, docked.
 *
 * Returns four progress values for a four-keyframe `useTransform`. Every beat
 * starts and ends inside its chapter's range -- and inside its cover's open
 * window, where there is one -- so the invariant the chapters were built on
 * still holds: at a chapter boundary every part is docked and the car is whole.
 */
export function beatFor(chapter: HeroLayer["chapter"], slot: number): number[] {
  const [from, to] = slotRange(chapter);
  const run = to - from;
  const slots = CHAPTER_SEQUENCE[chapter].length;
  const beatSpan = run * BEAT_SPAN;
  // One slot would divide by zero; it simply gets the whole run.
  const step = slots > 1 ? (run - beatSpan) / (slots - 1) : 0;
  const start = from + step * slot;
  return [
    start,
    start + beatSpan * BEAT_HOLD[0],
    start + beatSpan * BEAT_HOLD[1],
    start + beatSpan,
  ];
}

/**
 * The cover's own beat: open quickly, stay open for every slot, shut.
 *
 * Its hold is exactly the window `beatFor` hands the slots, which is what makes
 * "the hood is open whenever something under it is out" true by construction
 * rather than by two numbers happening to agree.
 */
export function coverBeatFor(chapter: HeroLayer["chapter"]): number[] {
  const [from, to] = CHAPTER_RANGE[chapter];
  const [openAt, shutAt] = slotRange(chapter);
  return [from, openAt, shutAt, to];
}

/** The id of the chapter's cover, if it has one. */
export function coverOf(chapter: HeroLayer["chapter"]): string | undefined {
  return CHAPTER_COVER[chapter];
}

/** Which slot a layer or engine part rides in, by id. */
export function slotFor(chapter: HeroLayer["chapter"], id: string): number {
  const slot = CHAPTER_SEQUENCE[chapter].findIndex((ids) => ids.includes(id));
  if (slot < 0) {
    throw new Error(
      `Hero layer "${id}" is in chapter ${chapter} but has no slot in CHAPTER_SEQUENCE ` +
        `and is not its cover. Every part needs one or the other, or it would ` +
        `share a beat and stop being separately legible.`,
    );
  }
  return slot;
}

/** The beat a layer or engine part rides, cover or slot. */
export function beatOf(chapter: HeroLayer["chapter"], id: string): number[] {
  return coverOf(chapter) === id ? coverBeatFor(chapter) : beatFor(chapter, slotFor(chapter, id));
}
