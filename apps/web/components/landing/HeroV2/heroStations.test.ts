import { describe, expect, it } from "vitest";
import {
  CHAPTER_RANGE,
  CHAPTER_SEQUENCE,
  FINALE_BEAT,
  beatFor,
  coverOf,
  type HeroLayer,
} from "./heroLayout";
import { SNAP_TOLERANCE, heroStations, stationNear, stationPlayingAt } from "./heroStations";

/**
 * The dwell points, checked against the animation rather than against the plan
 * (P14.S4).
 *
 * fableTasks §P14.S4 gives them as literals -- front 0.24, engine 0.52, body
 * 0.76, finale 0.95 -- and instructs the executor to verify them against
 * `CHAPTER_RANGE` and `beatFor` rather than trust them. **Three of the four do
 * not survive that.** The layout puts them at 0.18, 0.51, 0.83 and 0.93, and
 * the difference is not cosmetic: at 0.24 the front chapter's middle slot has
 * already finished its hold and is falling back to the car, and at 0.76 the
 * body chapter's first slot is still rising. A scroll that settled on either
 * would settle on a part in flight, which is the one thing a dwell point exists
 * to prevent.
 *
 * So the module derives them, and this is what "derived correctly" means.
 */

const CHAPTERS = [1, 2, 3] as const;

/** Which slots of a chapter are held at their peak at this scroll position. */
function heldSlots(chapter: HeroLayer["chapter"], p: number): number[] {
  return CHAPTER_SEQUENCE[chapter]
    .map((_, slot) => slot)
    .filter((slot) => {
      const beat = beatFor(chapter, slot);
      return p >= beat[1]! && p <= beat[2]!;
    });
}

/** Which slots have moved off the car at all -- rising, held or falling. */
function movingSlots(chapter: HeroLayer["chapter"], p: number): number[] {
  return CHAPTER_SEQUENCE[chapter]
    .map((_, slot) => slot)
    .filter((slot) => {
      const beat = beatFor(chapter, slot);
      return p > beat[0]! && p < beat[3]!;
    });
}

describe("hero station dwell points", () => {
  it("gives every chapter a station, plus the finale", () => {
    expect(heroStations().map((station) => station.id)).toEqual(["1", "2", "3", "finale"]);
  });

  it("has an odd slot count per chapter, so a middle slot exists", () => {
    // The dwell point is the centre of the *middle* slot. With an even count
    // there is no middle and `Math.floor((slots - 1) / 2)` would quietly pick
    // the earlier of the two, putting the station off-centre in its own
    // chapter. If a chapter ever gains or loses a part, this is the assertion
    // that says the dwell derivation needs revisiting -- not a screenshot three
    // steps later.
    for (const chapter of CHAPTERS) {
      expect(CHAPTER_SEQUENCE[chapter].length % 2, `chapter ${chapter}`).toBe(1);
    }
  });

  it("puts each chapter's dwell exactly on its own midpoint", () => {
    // Two independent readings of "the middle of this scene": the centre of the
    // middle slot's hold (what the module computes) and the midpoint of the
    // chapter's range (what a reader would guess). They agree because
    // `beatFor` lays the slots out symmetrically inside the run, and this pins
    // that agreement rather than assuming it survives a retune of BEAT_SPAN.
    for (const station of heroStations()) {
      if (!station.chapter) continue;
      const [from, to] = CHAPTER_RANGE[station.chapter];
      expect(station.p, `chapter ${station.chapter}`).toBeCloseTo((from + to) / 2, 10);
    }
  });

  it("lands on a frame where exactly one part is off the car, and it is holding", () => {
    // The end-state assertion, at the four positions the scroll is allowed to
    // settle on: not "something moved" but "here is precisely what is where".
    for (const station of heroStations()) {
      if (!station.chapter) continue;

      const held = heldSlots(station.chapter, station.p);
      expect(held, `chapter ${station.chapter} holds one slot`).toHaveLength(1);
      expect(held[0], `it is the middle slot`).toBe(
        Math.floor((CHAPTER_SEQUENCE[station.chapter].length - 1) / 2),
      );
      // ...and nothing else in the chapter is even in the air. A dwell point
      // with a second part mid-rise is a smeared frame.
      expect(movingSlots(station.chapter, station.p)).toEqual(held);

      // Every OTHER chapter is fully docked -- the sequential-chapters
      // invariant, read at the position the visitor is asked to stop at.
      for (const other of CHAPTERS) {
        if (other === station.chapter) continue;
        expect(movingSlots(other, station.p), `chapter ${other} at ${station.p}`).toEqual([]);
      }
    }
  });

  it("puts the finale's dwell in the middle of its full-mix hold", () => {
    const finale = heroStations().find((station) => station.id === "finale")!;
    expect(finale.p).toBeCloseTo((FINALE_BEAT[1] + FINALE_BEAT[2]) / 2, 10);
    expect(finale.p).toBeGreaterThan(FINALE_BEAT[1]);
    expect(finale.p).toBeLessThan(FINALE_BEAT[2]);
  });

  it("keeps every dwell inside a chapter that has a cover open, where there is one", () => {
    // Chapter 2's parts play under a lifted hood. A dwell point outside the
    // cover's open window would park the visitor in front of a closed bonnet
    // with the alternator's caption on screen.
    for (const station of heroStations()) {
      if (!station.chapter || !coverOf(station.chapter)) continue;
      const [from, to] = CHAPTER_RANGE[station.chapter];
      expect(station.p).toBeGreaterThan(from);
      expect(station.p).toBeLessThan(to);
    }
  });
});

describe("snap bands", () => {
  it("never overlap, so 'nearest' is never a coin toss", () => {
    const points = heroStations().map((station) => station.p);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]! - points[i - 1]!, `gap before station ${i}`).toBeGreaterThan(
        2 * SNAP_TOLERANCE,
      );
    }
  });

  it("stay inside the track", () => {
    for (const station of heroStations()) {
      expect(station.p - SNAP_TOLERANCE).toBeGreaterThan(0);
      expect(station.p + SNAP_TOLERANCE).toBeLessThan(1);
    }
  });

  it("snap inside the band and do nothing outside it", () => {
    for (const station of heroStations()) {
      expect(stationNear(station.p)?.id).toBe(station.id);
      expect(stationNear(station.p + SNAP_TOLERANCE * 0.99)?.id).toBe(station.id);
      expect(stationNear(station.p - SNAP_TOLERANCE * 0.99)?.id).toBe(station.id);
      expect(stationNear(station.p + SNAP_TOLERANCE * 1.01)).toBeNull();
      expect(stationNear(station.p - SNAP_TOLERANCE * 1.01)).toBeNull();
    }
  });

  it("leaves the visitor alone between the scenes", () => {
    // The gaps between chapters are deliberate rest beats. Stopping in one is a
    // decision, not a near miss.
    expect(stationNear(0.35)).toBeNull();
    expect(stationNear(0.67)).toBeNull();
    expect(stationNear(0)).toBeNull();
    expect(stationNear(1)).toBeNull();
  });
});

describe("which station is playing", () => {
  it("names the chapter across its whole range, not just at the dwell", () => {
    for (const chapter of CHAPTERS) {
      const [from, to] = CHAPTER_RANGE[chapter];
      // The finale overlaps chapter 3's tail and outranks it, so the far end of
      // chapter 3 is checked below rather than here.
      const end = Math.min(to, FINALE_BEAT[1] - 0.001);
      expect(stationPlayingAt(from)?.chapter, `${chapter} at its start`).toBe(chapter);
      expect(stationPlayingAt(end)?.chapter, `${chapter} near its end`).toBe(chapter);
    }
  });

  it("says nothing before the first part moves or between chapters", () => {
    expect(stationPlayingAt(0)).toBeNull();
    expect(stationPlayingAt(0.35)).toBeNull();
    expect(stationPlayingAt(0.67)).toBeNull();
  });

  it("lets the finale outrank the chapter 3 tail it overlaps", () => {
    // Same precedence `StageNarration` applies to the captions: once every part
    // is in the air the scene is the catalogue, not the windshield.
    expect(stationPlayingAt((FINALE_BEAT[1] + FINALE_BEAT[2]) / 2)?.id).toBe("finale");
    expect(stationPlayingAt(FINALE_BEAT[1] - 0.001)?.chapter).toBe(3);
  });
});
