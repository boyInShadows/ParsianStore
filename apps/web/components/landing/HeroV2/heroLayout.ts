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
 * ## Why no layer needs a correction any more
 *
 * Every dock below is `NATIVE`, and that is the point. The batch used to be
 * mixed: bumper, grille, fender and door were true in-place isolations, while
 * hood, windshield and the headlights were catalogue product shots -- a
 * different hood, photographed on a different camera -- carried onto the car by
 * a hand-tuned scale, offset and `rotateZ`. No 2D transform can seat a panel
 * shot from another angle, which is why those three never looked docked however
 * the numbers were nudged.
 *
 * They are now cut in place from the complete-car render, the same way the
 * fender and door were. `landing-src/samples-opaque/car.png` turned out to be
 * the *same render* as the stripped base at 2x: downscaled to 1024 it registers
 * onto `car-stripped.png` at scale 1.000, dx 0, dy 0. So each sprite is that
 * render masked to one panel, and its trim box is a real coordinate in the
 * frame. `pnpm check:hero` measures the result rather than trusting it:
 * base 65.2% alone, 97.7% with all seven stacked at 0,0, every sprite "docks".
 */

/** The master frame every hero layer was isolated from, in pixels. */
export const HERO_CANVAS = 1024;

/**
 * The stage's aspect ratio, as data rather than only as a Tailwind class.
 *
 * `HeroStage` draws `aspect-[16/11]`; this is the same number in a form the
 * rest of the module can compute with. P13 needs it because the finale has to
 * park ten parts in the empty canvas rows above and below the car, and "which
 * rows are empty" is a function of how much of the square frame the stage
 * actually shows. `heroScene.test.ts` fails if the class and this constant
 * ever disagree.
 */
export const HERO_STAGE_ASPECT = 16 / 11;

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
 * The CAMERA's vanishing point, in the same container-query units.
 *
 * A second, wider perspective than the frame's, and the two are not
 * interchangeable. The frame's 140cqw is the room the eight sprites share, so
 * they read as one object. This one is the room the camera moves in: the
 * chapter-2 tilt happens under it, and at 140 that tilt would foreshorten the
 * whole stage hard enough to show the frame's corners against the background.
 * Wider means a longer lens -- less distortion, which is what a camera move
 * over a car should look like.
 */
export const HERO_CAMERA_PERSPECTIVE_CQW = 220;

/**
 * Which canvas rows the stage actually shows.
 *
 * The frame is square and spans `HERO_FRAME_WIDTH_PCT` of a stage that is
 * `HERO_STAGE_ASPECT` wide for every 1 tall, so the stage is shorter than the
 * frame and crops it top and bottom. Horizontally nothing is cropped -- the
 * frame is narrower than the stage -- which is why only the rows are recorded.
 *
 * Every existing comment in this file quotes "roughly 130..894" from a
 * calculation someone did once by hand. This is that calculation, so it stays
 * true when the frame width or the stage's aspect is retuned. P13's finale
 * needs it as a number rather than as prose: the two clear bands it parks
 * parts in are exactly (visible top -> car top) and (car bottom -> visible
 * bottom).
 */
export const HERO_VISIBLE_ROWS = (() => {
  const span = HERO_CANVAS / (HERO_STAGE_ASPECT * (HERO_FRAME_WIDTH_PCT / 100));
  return { top: (HERO_CANVAS - span) / 2, bottom: (HERO_CANVAS + span) / 2 } as const;
})();

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
  /**
   * Peak scale. Slightly over 1 reads as "toward the viewer", not "bigger",
   * which is what every body panel uses. The engine parts are the exception and
   * say why at `HERO_ENGINE_PARTS`: they are sized at rest by what the hood can
   * hide, so the growth on the way out is how they become readable at all.
   */
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

/** Drawn exactly where it was rendered. Since the in-place recut, every layer. */
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
  // Cut from the complete-car render along the cowl gap at the back and the
  // hood's own front lip above the grille; the far edge is the car's silhouette
  // and the near edge is the fender, which paints over it. Lifts up and back
  // off its hinge.
  {
    id: "hood",
    asset: "sprite-hood",
    chapter: 2,
    dock: NATIVE,
    undock: { dx: 40, dy: -175, scale: 1.06 },
  },
  // The glass and its chrome trim, bounded by the aperture the stripped shell
  // leaves open -- so the cut is the hole, measured, not a traced outline.
  {
    id: "windshield",
    asset: "sprite-windshield",
    chapter: 3,
    dock: NATIVE,
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
  // One render, two lamps -- still, because both lenses come out of the same
  // frame and shipping them separately would be two requests for 3.4KB of
  // artwork. What changed is that the render is now the car's own: both lamps
  // sit at their real coordinates, so each instance is the SAME native dock
  // with a clip that reveals one lens. There is nothing left to scale.
  {
    id: "lamp-far",
    asset: "sprite-headlights",
    chapter: 1,
    dock: NATIVE,
    undock: { dx: -45, dy: -85, scale: 1.12 },
    clip: { top: 0, right: 87.85, bottom: 0, left: 0 },
  },
  {
    id: "lamp-near",
    asset: "sprite-headlights",
    chapter: 1,
    dock: NATIVE,
    undock: { dx: 15, dy: -105, scale: 1.12 },
    clip: { top: 0, right: 0, bottom: 0, left: 85.36 },
  },
  // The whole front bumper assembly -- blade, guards and the valance behind
  // them -- because that is exactly what the stripped shell is missing there.
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
 * The engine bay, in canvas pixels: the largest rectangle that fits inside the
 * docked hood's own alpha.
 *
 * An inscribed rectangle, not the hood's bounding box -- the hood is a panel
 * seen almost edge-on, so its box is 436x68 while the solid band inside it is
 * 196x36. Anything the hood is supposed to hide has to sit in the band, and
 * `manifestData.test.ts` checks that every part does. Measured by running the
 * maximal-rectangle scan over the shipped sprite's alpha, not read off a corner.
 *
 * **It shrank when the hood became real.** The old box was 487x138, derived
 * from a hood that was a catalogue product shot scaled 0.66 to look about
 * right; the three engine parts were sized against that fiction and were
 * roughly three times too big for the panel that is actually there. A derived
 * constant is only as true as what it is derived from -- and this one has now
 * been wrong in both directions, which is the argument for deriving it by
 * measurement each time rather than by eye.
 */
export const HERO_BAY = { left: 177, top: 449, right: 372, bottom: 484 } as const;

/**
 * The three parts that live under the hood (fableTasks2 §2.1's chapter 2).
 *
 * They are painted between the base and the sprites, so at rest the hood covers
 * them completely and the car still opens as a closed, whole car. Chapter 2
 * lifts the hood up and back, which uncovers them, and they drop out of the bay
 * on the same beat.
 *
 * **They are much smaller than they were, and the hood is the reason.** These
 * heights were 55/105/78 against a `HERO_BAY` derived from a hood that was a
 * catalogue product shot scaled 0.66; the real panel covers a 196x36 band, so
 * anything taller than about 32 poked out of a closed car. Rest size is now set
 * by what the hood actually hides, and the reading size is bought back on the
 * way out: `undock.scale` is 2.4 rather than the 1.12 the other layers use.
 * That is not a decorative flourish -- it is the only lever left once the panel
 * is fixed, and it is what a workshop manual does anyway, drawing the extracted
 * part larger than it sits. At 1440 they land around 50 CSS px tall in the
 * clear band under the car, which is where they are meant to be read.
 *
 * They travel DOWN, and the hood goes up. That was not the first attempt: the
 * obvious reading of "the parts rise" put all three in the band above the car,
 * where the lifted hood already is. Rendered, the alternator was completely
 * behind the hood -- both of them move toward the rear, so they arrive in the
 * same place. The stage's geometry is the reason: the car occupies canvas rows
 * 333-700 of a visible 130-894, so there are two clear bands, and at its peak
 * the hood covers most of the upper one. The lower band is 194px of nothing.
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
    place: { cx: 212, cy: 466, height: 30 },
    undock: { dx: -30, dy: 340, scale: 2.4 },
  },
  {
    id: "piston",
    asset: "piston",
    place: { cx: 275, cy: 466, height: 32 },
    undock: { dx: 0, dy: 350, scale: 2.4 },
  },
  {
    id: "alternator",
    asset: "alternator",
    place: { cx: 336, cy: 466, height: 30 },
    undock: { dx: 30, dy: 340, scale: 2.4 },
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

/**
 * Where the camera looks during each chapter, in canvas pixels.
 *
 * Only the point, never the magnification. How hard to push in is bounded by
 * the stage's own geometry rather than by taste -- the frame is already 92% of
 * the stage width, so anything past about 1.087 pushes the car out over the
 * copy column beside it -- and that bound belongs with the code that owns the
 * transform (`cameraRig.ts`, P13.S2), not with the scene description here.
 *
 * The points are the middle of what each chapter is about: the front-end
 * cluster, the engine bay `HERO_BAY` already describes, and the flank the
 * door and fender come off. `heroScene.test.ts` checks each one actually sits
 * inside the parts of its own chapter, so a retuned dock cannot leave the
 * camera aimed at empty air.
 */
export const STATION_FOCUS: Record<
  HeroLayer["chapter"],
  { readonly x: number; readonly y: number }
> = {
  1: { x: 250, y: 515 },
  2: { x: (HERO_BAY.left + HERO_BAY.right) / 2, y: (HERO_BAY.top + HERO_BAY.bottom) / 2 },
  3: { x: 581, y: 489 },
};

/**
 * The finale (fableTasks v1.1 §1.2 beat 4): every part parked around the
 * stripped body at once, so the last thing the visitor sees is the catalogue.
 *
 * ## Why membership is authored and everything else is derived
 *
 * There are exactly two places to park anything -- the clear canvas rows above
 * the car and the clear rows below it, because the car itself occupies the
 * middle and stays. Which band a part belongs in is a judgement (`the hood
 * lifted, so it reads as belonging above`); where it lands inside that band is
 * arithmetic, and arithmetic that has to survive a re-cut sprite. So this
 * declares the bands and `heroScene.ts` solves the positions.
 *
 * Order inside a band is not declared either: parts are laid out by their own
 * docked x-centre, so a band reads left to right in the same order the parts
 * sit on the car. An exploded diagram that shuffled its parts horizontally
 * would be harder to read than the car it came from.
 *
 * Membership is decided by room, not by which way the part travelled. Those
 * two are different questions and they disagree for four layers here: the two
 * headlights lift upward but park below, and the grille and door drop but park
 * above. The upper band is 204 canvas rows against the lower band's 195, and
 * it has to hold the door, which is the tallest thing in the scene -- so the
 * split is what fits, and `heroScene.ts` derives label placement separately
 * from the part's own motion.
 */
export const FINALE_BAND: Record<"above" | "below", readonly string[]> = {
  above: ["grille", "hood", "windshield", "door"],
  below: ["lamp-far", "air-filter", "bumper", "piston", "alternator", "lamp-near", "fender"],
};

/**
 * How big a part is at the finale, per pipeline group.
 *
 * Two numbers rather than one, for the same reason `undock.scale` is 1.05 for a
 * fender and 2.4 for a piston: the two groups are sized by different things. A
 * hero sprite is at its true size on the car and has to come *down* to fit ten
 * parts into two bands. An engine part is sized at rest by what a closed hood
 * can hide -- about 32 canvas pixels tall -- so shrinking it would make the
 * climax of the hero the moment the piston became invisible.
 *
 * 0.72 is not a preference either. The door is 232 canvas pixels tall and the
 * upper band is about 204, so with the label clearance below the scale cannot
 * exceed 0.757; 0.72 is that ceiling with a little margin.
 * `heroScene.test.ts` re-derives the ceiling and fails if this passes it.
 */
export const FINALE_SCALE: Record<"hero" | "hero-parts", number> = {
  hero: 0.72,
  "hero-parts": 1.9,
};

/**
 * Clear space required around every parked part, in canvas pixels.
 *
 * The finale is not just ten shapes that miss each other -- each one carries a
 * name chip (§1.3). A pack that merely avoids overlap puts those chips on top
 * of the neighbouring part, so the clearance is what the chips live in and the
 * overlap test asserts it rather than asserting zero.
 */
export const FINALE_CLEARANCE = 28;

/** Canvas pixels kept clear at each side of a band, so nothing parks flush. */
export const FINALE_MARGIN = 32;

/**
 * Where the finale plays, as a fraction of the hero's scroll.
 *
 * It overlaps the tail of chapter 3, which is the one place the sequential
 * rule bends: the finale is *about* everything being in the air at once, so
 * "one slot at a time" cannot describe it. Everything re-docks by 1.0 --
 * `e2e/landing-hero.spec.ts` asserts the hero ends as a whole car, and Gate B
 * settled that the finale is the climax rather than the resting state.
 */
export const FINALE_BEAT: readonly [number, number, number, number] = [0.86, 0.9, 0.96, 1.0];

/**
 * The suspended drift of a parked part, in canvas pixels and cycles per track.
 *
 * Small on purpose -- 3 pixels is under half a CSS pixel at the desktop stage,
 * so it reads as "these are hanging" rather than as a second animation
 * competing with the one that just finished. It is what stops the finale's
 * 6%-of-track hold from being the one genuinely frozen stretch of the scroll,
 * on the beat the visitor is meant to stop and read.
 */
export const FINALE_DRIFT = { amplitude: 3, cycles: 220 } as const;
