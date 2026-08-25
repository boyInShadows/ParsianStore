import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CHAPTER_RANGE,
  HERO_BASE_ASSET,
  HERO_CANVAS,
  HERO_FRAME_WIDTH_PCT,
  HERO_LAYERS,
} from "./heroLayout.js";
import { landingAsset } from "../../../lib/landing-image.js";

const PUBLIC_LANDING = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../public/landing",
);

const ALL_ASSETS = [HERO_BASE_ASSET, ...new Set(HERO_LAYERS.map((layer) => layer.asset))];

/**
 * The canvas rows the stage actually shows.
 *
 * The frame is square and spans HERO_FRAME_WIDTH_PCT of a 16/11 stage, so it is
 * taller than the stage and its top and bottom bands fall outside. A part that
 * undocks into those rows travels somewhere nobody can see.
 */
const VISIBLE = (() => {
  const frameOverStage = (HERO_FRAME_WIDTH_PCT / 100) * (16 / 11);
  const shown = 1 / frameOverStage;
  return { top: ((1 - shown) / 2) * HERO_CANVAS, bottom: ((1 + shown) / 2) * HERO_CANVAS };
})();

/** The box a layer occupies on the 1024² canvas, exactly as HeroStage places it. */
function dockedBox(layer: (typeof HERO_LAYERS)[number]) {
  const asset = landingAsset(`/landing/hero/${layer.asset}`);
  const width = asset.intrinsic.width * layer.dock.scale;
  const height = asset.intrinsic.height * layer.dock.scale;
  return {
    width,
    height,
    left: asset.trim!.left + (asset.intrinsic.width - width) / 2 + layer.dock.dx,
    top: asset.trim!.top + (asset.intrinsic.height - height) / 2 + layer.dock.dy,
  };
}

describe("HERO_LAYERS", () => {
  it("docks all seven sprites onto the stripped base", () => {
    // Seven layers of artwork but eight entries: the headlights render carries
    // both lamps, and the two sockets are too far apart at too small a size for
    // one scale to seat both, so it is placed twice and clipped to one lamp
    // each. Asset count is what the §3.2 inventory promises; layer count is an
    // implementation detail on top of it.
    expect(new Set(HERO_LAYERS.map((layer) => layer.asset)).size).toBe(7);
    expect(HERO_LAYERS).toHaveLength(8);
  });

  it("gives every layer a unique id", () => {
    const ids = HERO_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references hero assets the pipeline actually emitted", () => {
    for (const name of ALL_ASSETS) {
      expect(() => landingAsset(`/landing/hero/${name}`), name).not.toThrow();
      const asset = landingAsset(`/landing/hero/${name}`);
      const file = path.join(PUBLIC_LANDING, "hero", `${name}-${asset.widths.at(-1)}.avif`);
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("keeps every docked layer inside the canvas frame", () => {
    // A layer whose box runs off the 1024² frame is off the stage too, so the
    // part would be clipped away at rest rather than sitting on the car.
    for (const layer of HERO_LAYERS) {
      const box = dockedBox(layer);
      expect(box.left, `${layer.id} left`).toBeGreaterThanOrEqual(0);
      expect(box.top, `${layer.id} top`).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width, `${layer.id} end`).toBeLessThanOrEqual(HERO_CANVAS);
      expect(box.top + box.height, `${layer.id} bottom`).toBeLessThanOrEqual(HERO_CANVAS);
    }
  });

  it("overlaps the base rather than floating beside it", () => {
    // The whole point of a dock: a sprite that misses the body is a part lying
    // on the floor next to the car, which is the failure the v1 hero shipped.
    const base = landingAsset(`/landing/hero/${HERO_BASE_ASSET}`);
    const carLeft = base.trim!.left;
    const carTop = base.trim!.top;
    const carRight = carLeft + base.intrinsic.width;
    const carBottom = carTop + base.intrinsic.height;

    for (const layer of HERO_LAYERS) {
      const box = dockedBox(layer);
      expect(box.left, `${layer.id}`).toBeLessThan(carRight);
      expect(box.left + box.width, `${layer.id}`).toBeGreaterThan(carLeft);
      expect(box.top, `${layer.id}`).toBeLessThan(carBottom);
      expect(box.top + box.height, `${layer.id}`).toBeGreaterThan(carTop);
    }
  });

  it("leaves the in-place isolations at native registration", () => {
    // Bumper, grille, fender and door came back from the batch already in the
    // right place. If a future re-render moves one, this is what says so --
    // "someone nudged a part that did not need nudging" is otherwise invisible.
    const native = HERO_LAYERS.filter(
      (layer) => layer.dock.dx === 0 && layer.dock.dy === 0 && layer.dock.scale === 1,
    ).map((layer) => layer.id);
    expect(native.sort()).toEqual(["bumper", "door", "fender", "grille"]);
  });

  it("clips only the layers that share one render", () => {
    const clipped = HERO_LAYERS.filter((layer) => layer.clip).map((layer) => layer.id);
    expect(clipped.sort()).toEqual(["lamp-far", "lamp-near"]);
    for (const layer of HERO_LAYERS) {
      if (!layer.clip) continue;
      // Opposite insets summing past 100% would clip the layer to nothing.
      expect(layer.clip.left + layer.clip.right, layer.id).toBeLessThan(100);
      expect(layer.clip.top + layer.clip.bottom, layer.id).toBeLessThan(100);
    }
  });

  it("takes disjoint halves of the headlights render for the two lamps", () => {
    const far = HERO_LAYERS.find((layer) => layer.id === "lamp-far")!;
    const near = HERO_LAYERS.find((layer) => layer.id === "lamp-near")!;
    // If the windows overlapped, one socket would show a sliver of the other
    // lamp instead of a clean single unit.
    expect(100 - far.clip!.right).toBeLessThanOrEqual(near.clip!.left);
  });

  it("spreads the layers across all three separation chapters", () => {
    expect([...new Set(HERO_LAYERS.map((layer) => layer.chapter))].sort()).toEqual([1, 2, 3]);
  });

  it("gives every layer somewhere to go", () => {
    // A zero vector is a part that stays welded to the car through its own
    // chapter -- the group lifts away around it and it just sits there.
    for (const layer of HERO_LAYERS) {
      expect(Math.abs(layer.undock.dx) + Math.abs(layer.undock.dy), layer.id).toBeGreaterThan(0);
      expect(layer.undock.scale, layer.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps every undocked part inside the rows the stage actually shows", () => {
    // The trap this guards: the frame is taller than the stage, so `0..1024` is
    // NOT the visible range. A part that lifts 200px into the top band travels
    // out of sight and the chapter looks like it did nothing.
    for (const layer of HERO_LAYERS) {
      const box = dockedBox(layer);
      const top = box.top + layer.undock.dy;
      const bottom = top + box.height;
      const left = box.left + layer.undock.dx;
      expect(top, `${layer.id} lifts above the stage`).toBeGreaterThanOrEqual(VISIBLE.top);
      expect(bottom, `${layer.id} drops below the stage`).toBeLessThanOrEqual(VISIBLE.bottom);
      expect(left, `${layer.id} leaves the frame`).toBeGreaterThanOrEqual(0);
      expect(left + box.width, `${layer.id} leaves the frame`).toBeLessThanOrEqual(HERO_CANVAS);
    }
  });

  it("never leaves two parts of the same chapter stacked on each other", () => {
    // Undocked parts are the point of the beat; two of them occupying the same
    // box reads as one part, not two.
    for (const chapter of [1, 2, 3] as const) {
      const boxes = HERO_LAYERS.filter((layer) => layer.chapter === chapter).map((layer) => {
        const box = dockedBox(layer);
        return {
          id: layer.id,
          left: box.left + layer.undock.dx,
          top: box.top + layer.undock.dy,
          right: box.left + layer.undock.dx + box.width,
          bottom: box.top + layer.undock.dy + box.height,
        };
      });
      for (const [first, second] of boxes.flatMap((box, i) =>
        boxes.slice(i + 1).map((other) => [box, other] as const),
      )) {
        const overlapX = Math.min(first.right, second.right) - Math.max(first.left, second.left);
        const overlapY = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
        const area = Math.max(0, overlapX) * Math.max(0, overlapY);
        const smallest = Math.min(
          (first.right - first.left) * (first.bottom - first.top),
          (second.right - second.left) * (second.bottom - second.top),
        );
        expect(area / smallest, `${first.id} sits on ${second.id}`).toBeLessThan(0.6);
      }
    }
  });

  it("leaves room in the stage for the frame", () => {
    expect(HERO_FRAME_WIDTH_PCT).toBeGreaterThan(0);
    expect(HERO_FRAME_WIDTH_PCT).toBeLessThanOrEqual(100);
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

  it("runs the chapters one after another, never two groups in the air at once", () => {
    // Inverted at P9.S5 part 3, deliberately. The v1 hero overlapped its ranges
    // because it played one continuous one-way explosion. A docked car wants the
    // opposite: each group lifts away and settles back before the next opens, so
    // the composite stays legible and the end of the scroll is a whole car.
    expect(CHAPTER_RANGE[2][0]).toBeGreaterThan(CHAPTER_RANGE[1][1]);
    expect(CHAPTER_RANGE[3][0]).toBeGreaterThan(CHAPTER_RANGE[2][1]);
  });
});

const SPRITE_BUDGET_BYTES = 120 * 1024;
const BASE_BUDGET_BYTES = 90 * 1024;

function topRungAvif(src: string): number {
  const asset = landingAsset(src);
  const file = path.join(PUBLIC_LANDING, src.replace("/landing/", ""));
  return statSync(`${file}-${asset.widths.at(-1)}.avif`).size;
}

describe("hero layer assets", () => {
  it("trims every hero layer to its bounding box", () => {
    // Untrimmed, a sprite floats in a 1024² canvas that is 80% transparent, and
    // the trim offset heroLayout.ts docks against would mean nothing.
    for (const name of ALL_ASSETS) {
      const asset = landingAsset(`/landing/hero/${name}`);
      expect(asset.trim, name).not.toBeNull();
      expect(asset.trim!.canvas).toEqual({ width: HERO_CANVAS, height: HERO_CANVAS });
      expect(asset.intrinsic.width, name).toBeLessThan(HERO_CANVAS);
      expect(asset.trim!.left + asset.intrinsic.width).toBeLessThanOrEqual(HERO_CANVAS);
      expect(asset.trim!.top + asset.intrinsic.height).toBeLessThanOrEqual(HERO_CANVAS);
    }
  });

  it("leaves the standalone cutouts untrimmed and centred", () => {
    // The regression guard for the trap P9.S5 part 1 walked into: the cutouts
    // are positioned by their centre inside a 2048² frame, so a global trim
    // would silently move every one of them wherever they are used.
    for (const name of ["car", "piston", "alternator", "air-filter"]) {
      const asset = landingAsset(`/landing/cutouts/${name}`);
      expect(asset.trim, name).toBeNull();
      expect(asset.intrinsic, name).toEqual({ width: 2048, height: 2048 });
    }
  });

  it("holds the fableTasks §3.2 byte budgets", () => {
    expect(topRungAvif(`/landing/hero/${HERO_BASE_ASSET}`)).toBeLessThanOrEqual(BASE_BUDGET_BYTES);
    const sprites = ALL_ASSETS.filter((name) => name !== HERO_BASE_ASSET).reduce(
      (total, name) => total + topRungAvif(`/landing/hero/${name}`),
      0,
    );
    expect(sprites).toBeLessThanOrEqual(SPRITE_BUDGET_BYTES);
  });
});
