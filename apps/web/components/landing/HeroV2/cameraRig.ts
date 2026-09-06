import {
  CHAPTER_RANGE,
  FINALE_BEAT,
  HERO_CANVAS,
  HERO_FRAME_WIDTH_PCT,
  HERO_STAGE_ASPECT,
  HERO_VISIBLE_ROWS,
  STATION_FOCUS,
  coverOf,
  type HeroLayer,
} from "./heroLayout";
import { sceneParts } from "./heroScene";

/**
 * The stage's camera (fableTasks v1.1 P13.S2).
 *
 * The audit's fourth finding was "no camera, no light, no depth": the stage is
 * a fixed-size image at every scroll position, so a part sliding 80 pixels off
 * a car reads as a diagram updating rather than as something being taken apart.
 * This module is the first half of the answer -- one transform on one wrapper,
 * no new dependency, no new element per part.
 *
 * ## The scale is derived, because the obvious number does not fit
 *
 * The plan asked for a push-in to 1.35 on the nose. That works for chapter 1
 * and is impossible for the other two, and the reason is geometry rather than
 * taste: the frame is square, the stage shows only about 765 of its 1024 rows,
 * and a chapter's parts already use most of that band. Chapter 2 lifts the hood
 * to row 254 and drops the piston to row 854 -- 600 rows between them, so any
 * scale past about 1.12 pushes one end of the chapter off the stage at the
 * exact moment it is the subject.
 *
 * So each station's framing is solved instead of written down: take the
 * rectangle the chapter's own parts occupy at the top of their beats, add a
 * margin, and use the largest scale that still contains it. Chapter 1 gets the
 * dramatic push-in it can afford; chapters 2 and 3 get the framing they can.
 * When a sprite is re-cut or an undock distance retuned, the camera follows
 * rather than silently cropping the part somebody just moved.
 *
 * ## Why the centre is clamped
 *
 * `STATION_FOCUS` says where to look, not where the camera can go. Chapter 1
 * looks at canvas x=250, and at scale 1.35 a window centred there would run off
 * the start edge of the canvas and spend a third of the stage on empty
 * graphite. Clamping the window inside the canvas keeps the push-in pointed at
 * the car; the focus point is a preference the geometry is allowed to overrule.
 */

/**
 * The most the camera may ever push in, whatever the arithmetic allows.
 *
 * Chapter 1's parts would fit at 1.84. At that magnification the stage holds
 * the front wing and nothing else -- no longer a car being taken apart, just a
 * bumper. 1.35 is the plan's own number and comfortably inside what chapter 1
 * can carry.
 */
export const CAMERA_MAX_SCALE = 1.35;

/** The camera never pulls back past this; beyond it the car is a thumbnail. */
export const CAMERA_MIN_SCALE = 0.9;

/** Clear canvas pixels kept around a chapter's parts, so nothing is framed flush. */
export const CAMERA_MARGIN = 40;

/**
 * How much the camera keeps moving while a chapter plays.
 *
 * Gate A settled that the parts keep their sequential, tested beats -- each
 * chapter re-docks before the next opens -- and that the *camera* is what
 * removes the dead frames those rest beats used to leave. A station therefore
 * has two framings rather than one, a hair apart, so the stage is always
 * drifting even at the moments when every part is home. It is deliberately
 * below the threshold where it reads as a second animation.
 */
const DRIFT = 0.985;

export type CameraWindow = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type CameraStop = {
  /** Scroll progress this framing is reached at. */
  readonly at: number;
  readonly scale: number;
  /** Translation as a fraction of the stage box, ready for a percentage. */
  readonly x: number;
  readonly y: number;
  readonly rotateX: number;
  readonly rotateZ: number;
};

const clamp = (value: number, low: number, high: number) =>
  // `low > high` when the window is larger than the range it is clamped into --
  // at scale 1 the canvas is wider than the stage shows. Centring is the right
  // answer there, and Math.min/Math.max alone would silently pick an edge.
  low > high ? (low + high) / 2 : Math.min(Math.max(value, low), high);

/** The canvas rows the stage shows at scale 1, as a height. */
const VISIBLE_ROWS = HERO_VISIBLE_ROWS.bottom - HERO_VISIBLE_ROWS.top;

/**
 * Canvas coordinates as a fraction of the stage box.
 *
 * The frame is centred, spans `HERO_FRAME_WIDTH_PCT` of the stage's width, and
 * is square -- so one canvas pixel is a different fraction horizontally and
 * vertically, and conflating the two tilts the whole scene. Sanity checks: the
 * canvas centre maps to (0.5, 0.5), and `HERO_VISIBLE_ROWS` maps to y 0 and 1.
 */
const FRAME_W = HERO_FRAME_WIDTH_PCT / 100;
const FRAME_H = FRAME_W * HERO_STAGE_ASPECT;

const toStageX = (canvasX: number) => (1 - FRAME_W) / 2 + (canvasX / HERO_CANVAS) * FRAME_W;
const toStageY = (canvasY: number) => (1 - FRAME_H) / 2 + (canvasY / HERO_CANVAS) * FRAME_H;

/** The rectangle a chapter's own parts occupy at the top of their beats. */
function chapterExtent(chapter: HeroLayer["chapter"]) {
  const cover = coverOf(chapter);
  const members = sceneParts().filter((part) => part.chapter === chapter || part.id === cover);
  if (members.length === 0) throw new Error(`Chapter ${chapter} has no parts to frame.`);

  return {
    left: Math.min(...members.map((p) => p.peak.left)),
    right: Math.max(...members.map((p) => p.peak.left + p.peak.width)),
    top: Math.min(...members.map((p) => p.peak.top)),
    bottom: Math.max(...members.map((p) => p.peak.top + p.peak.height)),
  };
}

/**
 * The framing for one station: as close as its own parts allow, aimed as near
 * its focus point as the canvas allows.
 */
function frame(
  chapter: HeroLayer["chapter"],
  drift = 1,
): Omit<CameraStop, "at"> & {
  window: CameraWindow;
} {
  const extent = chapterExtent(chapter);
  const needWidth = extent.right - extent.left + CAMERA_MARGIN * 2;
  const needHeight = extent.bottom - extent.top + CAMERA_MARGIN * 2;

  // The window the stage shows shrinks as the camera pushes in, so the largest
  // usable scale is whichever axis runs out first.
  const scale =
    Math.min(CAMERA_MAX_SCALE, HERO_CANVAS / needWidth, VISIBLE_ROWS / needHeight) * drift;

  const windowW = HERO_CANVAS / scale;
  const windowH = VISIBLE_ROWS / scale;

  // Aim at the focus point, but never past the point where the chapter's own
  // parts -- or the canvas edges -- would leave the stage.
  const focus = STATION_FOCUS[chapter];
  const cx = clamp(
    clamp(focus.x, extent.right - windowW / 2, extent.left + windowW / 2),
    windowW / 2,
    HERO_CANVAS - windowW / 2,
  );
  const cy = clamp(
    clamp(focus.y, extent.bottom - windowH / 2, extent.top + windowH / 2),
    HERO_VISIBLE_ROWS.top + windowH / 2,
    HERO_VISIBLE_ROWS.bottom - windowH / 2,
  );

  return {
    scale,
    // Scale is taken about the stage's centre, so the translation that brings a
    // canvas point there has to be measured after the scale, not before.
    x: -(toStageX(cx) - 0.5) * scale,
    y: -(toStageY(cy) - 0.5) * scale,
    ...ANGLE[chapter],
    window: {
      left: cx - windowW / 2,
      right: cx + windowW / 2,
      top: cy - windowH / 2,
      bottom: cy + windowH / 2,
    },
  };
}

/**
 * The tilt and roll per station. Small numbers on purpose.
 *
 * Chapter 1 gets a slight roll, which is what a photograph taken by a person
 * standing over a car looks like. Chapter 2 gets the only real `rotateX` in the
 * hero -- looking down into an open engine bay is the one moment the scene has
 * a floor. Chapter 3 is level: a pan along the flank that tilted would read as
 * the car sliding rather than the camera moving.
 *
 * `rotateX` runs under the stage's own `perspective`, and past about 8 degrees
 * the far edge of a 16/11 stage foreshortens enough to expose the frame's
 * corners against the background.
 */
const ANGLE: Record<HeroLayer["chapter"], { rotateX: number; rotateZ: number }> = {
  1: { rotateX: 0, rotateZ: -1.2 },
  2: { rotateX: 6, rotateZ: 0 },
  3: { rotateX: 0, rotateZ: 0 },
};

/** Neutral: the whole canvas, square on, exactly what ships today. */
const NEUTRAL: Omit<CameraStop, "at"> = { scale: 1, x: 0, y: 0, rotateX: 0, rotateZ: 0 };

/**
 * Where the camera is at every point in the scroll.
 *
 * A station's move *starts before the previous chapter's parts have finished
 * settling* -- that is Gate A's middle path, and the whole reason the camera
 * exists as a separate track. The parts keep the sequential beats
 * `e2e/landing-hero.spec.ts` asserts (each chapter whole before the next
 * opens); the camera covers the rest beats those leave, so no scroll position
 * shows a stage where nothing at all is moving.
 */
export function cameraStops(): readonly CameraStop[] {
  const lead = (chapter: HeroLayer["chapter"]) => {
    const [from, to] = CHAPTER_RANGE[chapter];
    return from - (to - from) * 0.2;
  };
  const settled = (chapter: HeroLayer["chapter"]) => {
    const [from, to] = CHAPTER_RANGE[chapter];
    return from + (to - from) * 0.2;
  };

  return [
    { at: 0, ...NEUTRAL },
    // The arrival drift: a hair of push-in before anything detaches, so the
    // first thing the visitor sees is a scene that is already alive.
    { at: CHAPTER_RANGE[1][0], ...NEUTRAL, scale: 1.04 },
    { at: settled(1), ...frame(1) },
    { at: lead(2), ...frame(1, DRIFT) },
    { at: settled(2), ...frame(2) },
    { at: lead(3), ...frame(2, DRIFT) },
    { at: settled(3), ...frame(3) },
    { at: FINALE_BEAT[0], ...frame(3, DRIFT) },
    // The finale pulls back past neutral: ten parts parked around the car need
    // more room than the car alone. It keeps easing back across the hold rather
    // than stopping dead -- the parts are parked and still there, so without
    // this the longest beat in the hero would be its only frozen one.
    { at: FINALE_BEAT[1], ...NEUTRAL, scale: CAMERA_MIN_SCALE },
    { at: FINALE_BEAT[2], ...NEUTRAL, scale: CAMERA_MIN_SCALE * DRIFT },
    { at: FINALE_BEAT[3], ...NEUTRAL },
  ];
}

/** The stops as parallel arrays, which is the shape `useTransform` wants. */
export function cameraTrack() {
  const stops = cameraStops();
  return {
    input: stops.map((stop) => stop.at),
    scale: stops.map((stop) => stop.scale),
    x: stops.map((stop) => `${(stop.x * 100).toFixed(3)}%`),
    y: stops.map((stop) => `${(stop.y * 100).toFixed(3)}%`),
    rotateX: stops.map((stop) => stop.rotateX),
    rotateZ: stops.map((stop) => stop.rotateZ),
  };
}
