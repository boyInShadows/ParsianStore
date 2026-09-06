import { describe, expect, it } from "vitest";
import {
  CAMERA_MARGIN,
  CAMERA_MAX_SCALE,
  CAMERA_MIN_SCALE,
  cameraStops,
  cameraTrack,
} from "./cameraRig";
import {
  CHAPTER_RANGE,
  HERO_CANVAS,
  HERO_FRAME_WIDTH_PCT,
  HERO_STAGE_ASPECT,
  HERO_VISIBLE_ROWS,
  coverOf,
} from "./heroLayout";
import { sceneParts } from "./heroScene";

/**
 * The camera's job is to keep the thing a chapter is about on screen while
 * making the stage move. Both halves are assertable, and the first one is the
 * kind of failure that is invisible in review and obvious in a screenshot taken
 * three steps later: a scale that crops the very part the chapter just lifted.
 */

const FRAME_W = HERO_FRAME_WIDTH_PCT / 100;
const FRAME_H = FRAME_W * HERO_STAGE_ASPECT;
const VISIBLE_ROWS = HERO_VISIBLE_ROWS.bottom - HERO_VISIBLE_ROWS.top;

/** A canvas point's position in the stage box, after the camera transform. */
function project(canvas: { x: number; y: number }, stop: { scale: number; x: number; y: number }) {
  const fx = (1 - FRAME_W) / 2 + (canvas.x / HERO_CANVAS) * FRAME_W;
  const fy = (1 - FRAME_H) / 2 + (canvas.y / HERO_CANVAS) * FRAME_H;
  return { x: 0.5 + (fx - 0.5) * stop.scale + stop.x, y: 0.5 + (fy - 0.5) * stop.scale + stop.y };
}

/** The framing a chapter has settled into, i.e. the stop at 20% through it. */
function stopFor(chapter: 1 | 2 | 3) {
  const [from, to] = CHAPTER_RANGE[chapter];
  const at = from + (to - from) * 0.2;
  const stop = cameraStops().find((candidate) => Math.abs(candidate.at - at) < 1e-9);
  if (!stop) throw new Error(`no camera stop at chapter ${chapter}'s settle point`);
  return stop;
}

describe("the camera track", () => {
  it("runs forwards, which useTransform requires", () => {
    const input = cameraTrack().input;
    for (let i = 1; i < input.length; i += 1) {
      expect(input[i], `stop ${i} is not after stop ${i - 1}`).toBeGreaterThan(input[i - 1]!);
    }
  });

  it("starts and ends at the neutral framing", () => {
    const stops = cameraStops();
    for (const stop of [stops[0]!, stops[stops.length - 1]!]) {
      expect(stop.scale).toBe(1);
      expect(stop.x).toBe(0);
      expect(stop.y).toBe(0);
      expect(stop.rotateX).toBe(0);
      expect(stop.rotateZ).toBe(0);
    }
  });

  it("never leaves the stage motionless between two stops", () => {
    // Gate A's middle path: the parts keep their sequential beats, so the
    // camera is what covers the rest beats. Two consecutive stops with
    // identical framing would put a genuinely frozen stage back on the page --
    // which is the audit's third finding, arrived at from the other direction.
    const stops = cameraStops();
    for (let i = 1; i < stops.length; i += 1) {
      const a = stops[i - 1]!;
      const b = stops[i]!;
      const moved =
        Math.abs(a.scale - b.scale) > 1e-6 ||
        Math.abs(a.x - b.x) > 1e-6 ||
        Math.abs(a.y - b.y) > 1e-6 ||
        Math.abs(a.rotateX - b.rotateX) > 1e-6 ||
        Math.abs(a.rotateZ - b.rotateZ) > 1e-6;
      expect(moved, `the camera is frozen between p=${a.at} and p=${b.at}`).toBe(true);
    }
  });

  it("stays inside the scale bounds", () => {
    for (const stop of cameraStops()) {
      expect(stop.scale).toBeLessThanOrEqual(CAMERA_MAX_SCALE);
      // The drift multiplier can dip a hair under the floor; the floor is about
      // how far back the camera is *aimed*, not a hard clamp on the easing.
      expect(stop.scale).toBeGreaterThan(CAMERA_MIN_SCALE * 0.95);
    }
  });
});

describe("what each station frames", () => {
  it("keeps every part of the chapter on the stage at its peak", () => {
    // The failure this catches: chapter 2 lifts the hood to canvas row 254 and
    // drops the piston to 854, 600 rows apart. A push-in past about 1.12 puts
    // one end off the stage at the exact moment it is the subject -- and the
    // screenshot looks like a missing sprite, not a camera bug.
    for (const chapter of [1, 2, 3] as const) {
      const stop = stopFor(chapter);
      const cover = coverOf(chapter);
      const members = sceneParts().filter((p) => p.chapter === chapter || p.id === cover);

      for (const part of members) {
        const corners = [
          project({ x: part.peak.left, y: part.peak.top }, stop),
          project(
            { x: part.peak.left + part.peak.width, y: part.peak.top + part.peak.height },
            stop,
          ),
        ];
        for (const corner of corners) {
          expect(
            corner.x,
            `${part.id} is off the stage horizontally at chapter ${chapter}'s framing`,
          ).toBeGreaterThanOrEqual(-0.001);
          expect(corner.x, `${part.id} is off the stage horizontally`).toBeLessThanOrEqual(1.001);
          expect(
            corner.y,
            `${part.id} is off the stage vertically at chapter ${chapter}'s framing`,
          ).toBeGreaterThanOrEqual(-0.001);
          expect(corner.y, `${part.id} is off the stage vertically`).toBeLessThanOrEqual(1.001);
        }
      }
    }
  });

  it("pushes in as far as each chapter can actually carry", () => {
    // Not "is the number 1.35" -- that is the constant restated. This asserts
    // the camera takes the room it has: within a hair of either the cap or the
    // limit the chapter's own extent imposes.
    for (const chapter of [1, 2, 3] as const) {
      const stop = stopFor(chapter);
      const cover = coverOf(chapter);
      const members = sceneParts().filter((p) => p.chapter === chapter || p.id === cover);
      const width =
        Math.max(...members.map((p) => p.peak.left + p.peak.width)) -
        Math.min(...members.map((p) => p.peak.left)) +
        CAMERA_MARGIN * 2;
      const height =
        Math.max(...members.map((p) => p.peak.top + p.peak.height)) -
        Math.min(...members.map((p) => p.peak.top)) +
        CAMERA_MARGIN * 2;

      const ceiling = Math.min(CAMERA_MAX_SCALE, HERO_CANVAS / width, VISIBLE_ROWS / height);
      expect(stop.scale, `chapter ${chapter} leaves room on the table`).toBeCloseTo(ceiling, 6);
    }
  });

  it("gives the engine bay the only tilt, and keeps it gentle", () => {
    expect(stopFor(2).rotateX).toBeGreaterThan(0);
    expect(stopFor(2).rotateX).toBeLessThanOrEqual(8);
    expect(stopFor(1).rotateX).toBe(0);
    expect(stopFor(3).rotateX).toBe(0);
    // A pan along the flank that also rolled would read as the car sliding.
    expect(stopFor(3).rotateZ).toBe(0);
  });
});
