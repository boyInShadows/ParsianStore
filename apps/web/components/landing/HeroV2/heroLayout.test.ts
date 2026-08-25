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

  it("overlaps the chapters so the separation reads as one sequence", () => {
    expect(CHAPTER_RANGE[2][0]).toBeLessThan(CHAPTER_RANGE[1][1]);
    expect(CHAPTER_RANGE[3][0]).toBeLessThan(CHAPTER_RANGE[2][1]);
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
