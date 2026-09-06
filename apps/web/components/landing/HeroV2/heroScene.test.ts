import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FINALE_BAND,
  FINALE_CLEARANCE,
  FINALE_MARGIN,
  FINALE_SCALE,
  HERO_CANVAS,
  HERO_ENGINE_PARTS,
  HERO_LAYERS,
  HERO_STAGE_ASPECT,
  HERO_VISIBLE_ROWS,
  STATION_FOCUS,
} from "./heroLayout";
import { finaleBands, sceneParts, scenePartById, type CanvasBox } from "./heroScene";

/**
 * The finale is the one beat nobody can eyeball.
 *
 * Ten parts land in two bands at two different scales, three of them are
 * clipped or placed rather than registered, and the whole layout shifts the
 * next time a sprite is re-cut at a different size. "It looked right in the
 * screenshot" is how `HERO_BAY` ended up derived from a hood that was a
 * catalogue product shot, with three engine parts sized against the fiction.
 *
 * So the packing is asserted, not reviewed.
 */

const overlap = (a: CanvasBox, b: CanvasBox, clearance: number) => {
  const gapX = Math.max(a.left - (b.left + b.width), b.left - (a.left + a.width));
  const gapY = Math.max(a.top - (b.top + b.height), b.top - (a.top + a.height));
  // Boxes are clear of each other if they are separated on EITHER axis.
  return Math.max(gapX, gapY) < clearance;
};

/** Where a part's visible pixels end up once its finale transform is applied. */
function parkedBox(id: string): CanvasBox {
  const part = scenePartById().get(id);
  if (!part) throw new Error(`no scene part "${id}"`);
  const { visual, box, finale } = part;
  // Scale is about the ELEMENT box centre, so the visible rectangle moves under
  // it -- the same arithmetic heroScene solves, applied forwards here so the
  // test checks the answer rather than restating the formula.
  const boxCentre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const left = boxCentre.x + (visual.left - boxCentre.x) * finale.scale + finale.dx;
  const top = boxCentre.y + (visual.top - boxCentre.y) * finale.scale + finale.dy;
  return { left, top, width: visual.width * finale.scale, height: visual.height * finale.scale };
}

describe("the scene's derived geometry", () => {
  it("covers every layer and engine part exactly once", () => {
    const ids = sceneParts().map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      [...HERO_LAYERS.map((l) => l.id), ...HERO_ENGINE_PARTS.map((p) => p.id)].sort(),
    );
  });

  it("gives the two headlights different anchors, though they share one render", () => {
    // The regression this exists for: both lamps are the same 321px-wide box
    // clipped to opposite ends. Anchoring at the box centre would point both
    // labels at the middle of the grille, and the bug would look like a styling
    // problem rather than a geometry one.
    const far = scenePartById().get("lamp-far")!;
    const near = scenePartById().get("lamp-near")!;
    expect(far.box.left).toBeCloseTo(near.box.left, 5);
    expect(Math.abs(far.anchor.x - near.anchor.x)).toBeGreaterThan(200);
    expect(far.visual.width).toBeLessThan(far.box.width / 4);
  });

  it("anchors each part where it comes to rest, not where it docks", () => {
    for (const part of sceneParts()) {
      const layer =
        HERO_LAYERS.find((l) => l.id === part.id) ??
        HERO_ENGINE_PARTS.find((p) => p.id === part.id);
      const dockCentreY = part.visual.top + part.visual.height / 2;
      expect(part.anchor.y - dockCentreY).toBeCloseTo(layer!.undock.dy, 5);
    }
  });

  it("labels each part into the band it actually travels toward", () => {
    for (const part of sceneParts()) {
      const layer =
        HERO_LAYERS.find((l) => l.id === part.id) ??
        HERO_ENGINE_PARTS.find((p) => p.id === part.id);
      expect(part.band).toBe(layer!.undock.dy < 0 ? "above" : "below");
    }
  });
});

describe("the finale packing", () => {
  it("parks every part with room for its name chip", () => {
    const parked = sceneParts().map((part) => ({ id: part.id, box: parkedBox(part.id) }));
    const collisions: string[] = [];

    for (let i = 0; i < parked.length; i += 1) {
      for (let j = i + 1; j < parked.length; j += 1) {
        const a = parked[i]!;
        const b = parked[j]!;
        if (overlap(a.box, b.box, FINALE_CLEARANCE)) collisions.push(`${a.id} / ${b.id}`);
      }
    }

    expect(
      collisions,
      `These parked parts are closer than FINALE_CLEARANCE (${FINALE_CLEARANCE}px), so their ` +
        `name chips would sit on top of the neighbouring part. Either lower FINALE_SCALE or ` +
        `move a part to the other band in FINALE_BAND.`,
    ).toEqual([]);
  });

  it("keeps every parked part inside the rows the stage actually shows", () => {
    for (const part of sceneParts()) {
      const box = parkedBox(part.id);
      expect(box.top, `${part.id} parks above the visible frame`).toBeGreaterThanOrEqual(
        HERO_VISIBLE_ROWS.top,
      );
      expect(box.top + box.height, `${part.id} parks below the visible frame`).toBeLessThanOrEqual(
        HERO_VISIBLE_ROWS.bottom,
      );
      expect(box.left, `${part.id} parks off the start edge`).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width, `${part.id} parks off the end edge`).toBeLessThanOrEqual(
        HERO_CANVAS,
      );
    }
  });

  it("never parks a part on top of the car it came off", () => {
    const bands = finaleBands();
    for (const part of sceneParts()) {
      const box = parkedBox(part.id);
      const inAbove = box.top + box.height <= bands.above.bottom;
      const inBelow = box.top >= bands.below.top;
      expect(
        inAbove || inBelow,
        `${part.id} overlaps the stripped body -- the finale is parts arranged AROUND the car, ` +
          `so a part sitting on it reads as one that failed to detach.`,
      ).toBe(true);
    }
  });

  it("holds FINALE_SCALE under the ceiling the tallest parked sprite allows", () => {
    // Re-derived rather than copied: the upper band has to fit the tallest
    // thing in it plus the clearance its chip needs. This is the constraint
    // that picked 0.72, so it is the one that should fail if a sprite is
    // re-cut taller.
    const bands = finaleBands();
    const height = bands.above.bottom - bands.above.top;
    const tallest = Math.max(
      ...FINALE_BAND.above.map((id) => scenePartById().get(id)!.visual.height),
    );
    const ceiling = (height - FINALE_CLEARANCE) / tallest;
    expect(FINALE_SCALE.hero).toBeLessThanOrEqual(ceiling);
  });

  it("leaves every part in a band a real gap, not a hairline", () => {
    const usable = HERO_CANVAS - FINALE_MARGIN * 2;
    for (const name of ["above", "below"] as const) {
      const total = FINALE_BAND[name].reduce((sum, id) => {
        const part = scenePartById().get(id)!;
        return sum + part.visual.width * FINALE_SCALE[part.group];
      }, 0);
      const gap = (usable - total) / (FINALE_BAND[name].length + 1);
      expect(gap, `the ${name} band is packed tighter than its chips can survive`).toBeGreaterThan(
        FINALE_CLEARANCE,
      );
    }
  });

  it("parks every part in the scene -- none is left on the car", () => {
    const parked = new Set([...FINALE_BAND.above, ...FINALE_BAND.below]);
    for (const part of sceneParts()) {
      expect(parked.has(part.id), `${part.id} has no finale parking spot`).toBe(true);
    }
  });
});

describe("the camera's focus points", () => {
  it("aims at something its chapter actually moves", () => {
    for (const chapter of [1, 2, 3] as const) {
      const members = sceneParts().filter((part) => part.chapter === chapter);
      const left = Math.min(...members.map((p) => p.visual.left));
      const right = Math.max(...members.map((p) => p.visual.left + p.visual.width));
      const top = Math.min(...members.map((p) => p.visual.top));
      const bottom = Math.max(...members.map((p) => p.visual.top + p.visual.height));

      const focus = STATION_FOCUS[chapter];
      expect(focus.x, `station ${chapter} looks left of its own parts`).toBeGreaterThanOrEqual(
        left,
      );
      expect(focus.x, `station ${chapter} looks right of its own parts`).toBeLessThanOrEqual(right);
      expect(focus.y, `station ${chapter} looks above its own parts`).toBeGreaterThanOrEqual(top);
      expect(focus.y, `station ${chapter} looks below its own parts`).toBeLessThanOrEqual(bottom);
    }
  });
});

describe("HERO_STAGE_ASPECT", () => {
  it("is the ratio HeroStage actually draws", () => {
    // The constant and the Tailwind class are two statements of one fact, and
    // the visible rows -- and so the whole finale -- are computed from the
    // constant. If someone retunes the class the bands silently move.
    const source = readFileSync(path.join(__dirname, "HeroStage.tsx"), "utf8");
    const match = /aspect-\[(\d+)\/(\d+)\]/.exec(source);
    expect(match, "HeroStage no longer declares an aspect-[w/h] class").not.toBeNull();
    expect(Number(match![1]) / Number(match![2])).toBeCloseTo(HERO_STAGE_ASPECT, 6);
  });

  it("puts the visible rows where every other comment in the module says they are", () => {
    expect(HERO_VISIBLE_ROWS.top).toBeGreaterThan(125);
    expect(HERO_VISIBLE_ROWS.top).toBeLessThan(135);
    expect(HERO_VISIBLE_ROWS.bottom).toBeGreaterThan(889);
    expect(HERO_VISIBLE_ROWS.bottom).toBeLessThan(899);
  });
});
