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
import { CALLOUT_DOT, CALLOUT_SLOT } from "./heroLayout";
import { finaleBands, sceneParts, scenePartById, stageToCanvas, type CanvasBox } from "./heroScene";
import { cameraWindow, leaderTarget } from "./cameraRig";

/** The stripped body's own box, from the same source heroScene reads. */

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

  /**
   * P14.S5 asked for a `finaleMobile` parking table, on a measurement from the
   * audit: "at 390 the bumper overlaps headlight-left by ~11px and
   * headlight-right by ~5px". Re-derived here rather than acted on, because the
   * measurement is real and its conclusion is not.
   *
   * Two things it gets wrong. First, the finale has **no width dependence at
   * all**: every parked position is a percentage of the 1024² canvas, so the
   * layout at 390 and at 1440 is the same layout, and a mobile table would have
   * nothing different to say. Second, what overlaps is the headlights' ELEMENT
   * box, not their pixels -- they are one 231-wide render drawn twice and
   * clipped to a 28px lens and a 34px lens, and `getBoundingClientRect` returns
   * the box, not the clip. The overlap the audit measured is transparent space.
   *
   * The arithmetic: at 390 the frame is 329 CSS px wide, so one canvas pixel is
   * 0.3217 CSS px. lamp-far's box overlaps the bumper's by 39.7 canvas px
   * (12.8 CSS px) and lamp-near's by 18.8 (6.0 CSS px) -- which is the audit's
   * ~11px and ~5px, reproduced. The VISIBLE rectangles clear each other by more
   * than `FINALE_CLEARANCE` in every pair, which is what the first test in this
   * block already asserts.
   */
  it("overlaps only where a clipped sprite's box is bigger than its pixels", () => {
    const boxOf = (id: string, which: "box" | "visual") => {
      const part = scenePartById().get(id)!;
      const centre = {
        x: part.box.left + part.box.width / 2,
        y: part.box.top + part.box.height / 2,
      };
      const rect = part[which];
      return {
        left: centre.x + (rect.left - centre.x) * part.finale.scale + part.finale.dx,
        top: centre.y + (rect.top - centre.y) * part.finale.scale + part.finale.dy,
        width: rect.width * part.finale.scale,
        height: rect.height * part.finale.scale,
      };
    };

    const overlapX = (a: CanvasBox, b: CanvasBox) =>
      Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);

    // The audit's own two pairs, as element boxes: the overlap is there.
    expect(overlapX(boxOf("lamp-far", "box"), boxOf("bumper", "box"))).toBeGreaterThan(30);
    expect(overlapX(boxOf("lamp-near", "box"), boxOf("bumper", "box"))).toBeGreaterThan(10);

    // And as pixels: it is not, in either direction, by more than the
    // clearance a name chip would need.
    expect(overlapX(boxOf("lamp-far", "visual"), boxOf("bumper", "visual"))).toBeLessThan(
      -FINALE_CLEARANCE,
    );
    expect(overlapX(boxOf("lamp-near", "visual"), boxOf("bumper", "visual"))).toBeLessThan(
      -FINALE_CLEARANCE,
    );

    // The whole reason the two readings differ: the lamps' boxes are an order
    // of magnitude wider than the lenses inside them.
    for (const id of ["lamp-far", "lamp-near"]) {
      expect(boxOf(id, "box").width / boxOf(id, "visual").width).toBeGreaterThan(5);
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

/**
 * The leader line's geometry (P14.S5).
 *
 * The dot is in canvas space and the plate is in stage space, so the line
 * between them is one coordinate conversion away from pointing at nothing. That
 * conversion is the only piece of this step that cannot be judged from a
 * screenshot: a leader that ends 40px short of the plate looks almost right,
 * which is the exact failure mode P13.S3's callout layer already shipped once.
 */
describe("the callout leader", () => {
  it("inverts the camera's own canvas-to-stage mapping", () => {
    // The two sanity checks cameraRig states for the forward direction, read
    // backwards. If these drift, the leader points at where the plate was
    // before someone retuned the frame width.
    const centre = stageToCanvas(0.5, 0.5);
    expect(centre.x).toBeCloseTo(HERO_CANVAS / 2, 6);
    expect(centre.y).toBeCloseTo(HERO_CANVAS / 2, 6);

    expect(stageToCanvas(0, 0).y).toBeCloseTo(HERO_VISIBLE_ROWS.top, 6);
    expect(stageToCanvas(0, 1).y).toBeCloseTo(HERO_VISIBLE_ROWS.bottom, 6);
  });

  it("ends inside the window the camera is actually showing", () => {
    // The check that matters, and the one the first cut of this failed. A
    // target inside `HERO_VISIBLE_ROWS` is only inside the STAGE while the
    // camera is neutral; chapter 1 pushes in to 1.35 and shows a window barely
    // more than half that tall, so an unclamped target rendered 38px above the
    // stage at 1440x900 -- a blue hairline over the headline.
    for (const band of ["above", "below"] as const) {
      for (const chapter of [1, 2, 3] as const) {
        const target = leaderTarget(band, chapter);
        const window = cameraWindow(chapter);
        const where = `${band} leader in chapter ${chapter}`;

        expect(target.y, `${where} is above the camera window`).toBeGreaterThanOrEqual(window.top);
        expect(target.y, `${where} is below the camera window`).toBeLessThanOrEqual(window.bottom);
        expect(target.x, `${where} is off the window's start edge`).toBeGreaterThanOrEqual(
          window.left,
        );
        expect(target.x, `${where} is off the window's end edge`).toBeLessThanOrEqual(window.right);

        // And inside the rows the stage shows at rest too, which is the weaker
        // condition the window implies -- asserted because the camera could in
        // principle be retuned to frame something outside the canvas.
        expect(target.y, `${where} is outside the visible rows`).toBeGreaterThan(
          HERO_VISIBLE_ROWS.top,
        );
        expect(target.y, `${where} is outside the visible rows`).toBeLessThan(
          HERO_VISIBLE_ROWS.bottom,
        );
      }
    }

    // The plate for a part that went UP is pinned to the bottom of the stage,
    // and vice versa -- that is the whole point of `data-band`. So the two
    // targets must sit on opposite sides of the canvas centre, or a caption and
    // the part it names would share a half of the stage.
    for (const chapter of [1, 2, 3] as const) {
      expect(leaderTarget("above", chapter).y).toBeGreaterThan(HERO_CANVAS / 2);
      expect(leaderTarget("below", chapter).y).toBeLessThan(HERO_CANVAS / 2);
    }
  });

  it("aims at a column the plate covers at every stage width", () => {
    // `.hero-callout` is `min(22rem, 44%)` wide from a 3% inline-start inset,
    // so its inner edge is a different fraction of the stage at every width and
    // cannot be one number. `CALLOUT_SLOT.x` has to be under the NARROWEST that
    // plate ever is as a fraction: 22rem (352px) over the widest stage the
    // container allows -- 1440px less a 20rem job-card column, its 2rem gap and
    // the 2rem gutters, so 1024px.
    const widestStage = 1440 - 2 * 32 - 320 - 32;
    const narrowestPlate = Math.min(352 / widestStage, 0.44);
    expect(CALLOUT_SLOT.x).toBeGreaterThan(0.03);
    expect(CALLOUT_SLOT.x).toBeLessThan(0.03 + narrowestPlate);
  });

  it("keeps the dot smaller than the smallest part it marks", () => {
    // Measured against `peak`, not `visual`: the dot only ever appears on a
    // part that has left the car, and a part in the air is at its undock scale
    // -- 2.4 for the engine trio, which is the whole reason they are readable
    // at all. The piston is 13 canvas pixels wide at rest and 31 out of the
    // bay, and it is the smallest thing here either way. A dot that covered its
    // own subject would be a blob where a part used to be.
    const smallest = Math.min(...sceneParts().map((part) => part.peak.width));
    expect(CALLOUT_DOT * 2).toBeLessThan(smallest);
  });
});
