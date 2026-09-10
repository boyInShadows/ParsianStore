import { landingAsset } from "@/lib/landing-image";
import {
  FINALE_BAND,
  FINALE_MARGIN,
  FINALE_SCALE,
  HERO_BASE_ASSET,
  HERO_CANVAS,
  HERO_ENGINE_CHAPTER,
  HERO_ENGINE_PARTS,
  HERO_FRAME_WIDTH_PCT,
  HERO_LAYERS,
  HERO_STAGE_ASPECT,
  HERO_VISIBLE_ROWS,
  type HeroClip,
  type HeroLayer,
} from "./heroLayout";

/**
 * The scene's geometry, solved rather than typed (fableTasks v1.1 P13.S1).
 *
 * `heroLayout.ts` says what each part *is* and where it goes; this module works
 * out the consequences -- where a part's visible pixels actually sit, where its
 * label should point, and where it parks in the finale.
 *
 * ## Why this is a second module and not more of the first
 *
 * `heroLayout.ts` has no imports, and that is load-bearing rather than tidy:
 * `e2e/landing-hero.spec.ts` imports it directly to derive its own sample
 * points, and Playwright can only do that while the module pulls in nothing
 * else. Reading `landing-assets.json` there would end that, and the e2e suite
 * would go back to hard-coded scroll positions that drift every time a beat is
 * retuned. So the authored intent stays there and the arithmetic lives here.
 *
 * ## Why derive at all
 *
 * The plan (v1.1 §P13.S1) proposed storing `anchor`, `labelSide` and `finale`
 * as three hand-written fields per part -- thirty numbers describing geometry
 * that is already fully determined by the trim boxes and the undock vectors.
 * Every one of them would silently go stale the next time a sprite is re-cut,
 * and this repo has already paid for that once: `HERO_BAY` was derived from a
 * hood that turned out to be a catalogue product shot, and every engine part
 * was sized against the fiction. A number that can be computed is computed.
 *
 * What is *not* derivable stayed authored, in `heroLayout.ts`: which band a
 * part parks in, how big it is there, and where the camera looks. Those are
 * judgements, and they read like judgements.
 */

/** A rectangle on the 1024² canvas. */
export type CanvasBox = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/** Which pipeline group a part's asset comes from, and so how it is placed. */
export type SceneGroup = "hero" | "hero-parts";

export type ScenePart = {
  readonly id: string;
  readonly group: SceneGroup;
  readonly chapter: HeroLayer["chapter"];
  /** The element's own box: what a transform scales and translates. */
  readonly box: CanvasBox;
  /** What the visitor actually sees -- `box` narrowed by `clip`, if any. */
  readonly visual: CanvasBox;
  /**
   * The visible rectangle at the top of this part's beat: `visual` moved by
   * `undock` and grown by `undock.scale`.
   *
   * This is what the camera has to keep on screen (`cameraRig.ts`). Framing a
   * chapter against the parts' *docked* boxes would push the very thing the
   * chapter is about out of the stage at exactly the moment it matters.
   */
  readonly peak: CanvasBox;
  /** Centre of the visible pixels once the part has left the car. */
  readonly anchor: { readonly x: number; readonly y: number };
  /** The clear band the part travelled into, and so where its label belongs. */
  readonly band: "above" | "below";
  /** The transform that parks it in the finale, in the same units as `undock`. */
  readonly finale: { readonly dx: number; readonly dy: number; readonly scale: number };
};

const centre = (box: CanvasBox) => ({
  x: box.left + box.width / 2,
  y: box.top + box.height / 2,
});

/**
 * A hero sprite's box, from the trim offset the pipeline recorded plus its
 * dock.
 *
 * The same recentring `HeroStage.place()` does, and for the same reason: a
 * dock's `scale` is taken about the box's own centre, so a resized part stays
 * where it was instead of drifting toward the top-left corner. Kept in step
 * with that function by `heroScene.test.ts`, which renders both.
 */
function layerBox(layer: HeroLayer): CanvasBox {
  const asset = landingAsset(`/landing/hero/${layer.asset}`);
  if (!asset.trim) {
    throw new Error(
      `Hero layer "${layer.asset}" is untrimmed, so it carries no registration. ` +
        `Re-run \`pnpm optimize:landing\`.`,
    );
  }
  const width = asset.intrinsic.width * layer.dock.scale;
  const height = asset.intrinsic.height * layer.dock.scale;
  return {
    left: asset.trim.left + (asset.intrinsic.width - width) / 2 + layer.dock.dx,
    top: asset.trim.top + (asset.intrinsic.height - height) / 2 + layer.dock.dy,
    width,
    height,
  };
}

/**
 * `clip-path: inset()` narrows what is painted without moving the element, so
 * the box a transform acts on and the pixels a visitor sees are different
 * rectangles.
 *
 * That gap is the whole reason this function exists. The two headlights are one
 * render drawn twice, clipped to one lens each: their boxes are identical and
 * 321 canvas pixels wide, while the lenses are 39 and 47 pixels wide at
 * opposite ends. Anchor a label at the box centre and both lamps point at the
 * same spot in the middle of the grille; park by the box and the two lamps
 * stack on top of each other in the finale.
 */
function clipped(box: CanvasBox, clip: HeroClip | undefined): CanvasBox {
  if (!clip) return box;
  const left = box.left + (box.width * clip.left) / 100;
  const top = box.top + (box.height * clip.top) / 100;
  return {
    left,
    top,
    width: box.width * (1 - (clip.left + clip.right) / 100),
    height: box.height * (1 - (clip.top + clip.bottom) / 100),
  };
}

/**
 * An engine part's box: placed, not registered.
 *
 * `HeroStage.placePart()`'s arithmetic. A catalogue product shot has no
 * coordinate in the car render to correct, so the placement *is* the position
 * and the width follows from the asset's own aspect ratio.
 */
function enginePartBox(part: (typeof HERO_ENGINE_PARTS)[number]): CanvasBox {
  const asset = landingAsset(`/landing/hero-parts/${part.asset}`);
  const height = part.place.height;
  const width = height * (asset.intrinsic.width / asset.intrinsic.height);
  return {
    left: part.place.cx - width / 2,
    top: part.place.cy - height / 2,
    width,
    height,
  };
}

/** The stripped body, which never moves and so defines the two clear bands. */
export function baseBox(): CanvasBox {
  const asset = landingAsset(`/landing/hero/${HERO_BASE_ASSET}`);
  if (!asset.trim) throw new Error("The stripped base is untrimmed and cannot anchor the scene.");
  return {
    left: asset.trim.left,
    top: asset.trim.top,
    width: asset.intrinsic.width,
    height: asset.intrinsic.height,
  };
}

/**
 * The clear canvas rows above and below the car.
 *
 * Both are derived: the visible rows come from the stage's aspect and the
 * frame's width, and the car's own extent comes from the base sprite's trim
 * box. Nothing here is a number somebody measured off a screenshot once.
 */
export function finaleBands() {
  const car = baseBox();
  return {
    above: { top: HERO_VISIBLE_ROWS.top, bottom: car.top },
    below: { top: car.top + car.height, bottom: HERO_VISIBLE_ROWS.bottom },
  } as const;
}

/** Every part in the scene, before the derived fields are added. */
function rawParts() {
  return [
    ...HERO_LAYERS.map((layer) => ({
      id: layer.id,
      group: "hero" as const,
      chapter: layer.chapter,
      undock: layer.undock,
      box: layerBox(layer),
      clip: layer.clip,
    })),
    ...HERO_ENGINE_PARTS.map((part) => ({
      id: part.id,
      group: "hero-parts" as const,
      chapter: HERO_ENGINE_CHAPTER,
      undock: part.undock,
      box: enginePartBox(part),
      clip: undefined,
    })),
  ];
}

/**
 * Where each part parks, solved band by band.
 *
 * Even gaps rather than a packing algorithm: with one row of parts and a fixed
 * width, "spread them out" *is* the optimal layout, and a solver would only
 * make the result harder to predict when a sprite changes size. The gap that
 * falls out is checked against `FINALE_CLEARANCE` by the test rather than
 * clamped here -- silently overlapping labels because the numbers no longer fit
 * is exactly the failure that should stop a build, not one to paper over.
 *
 * Parts are ordered by their docked x-centre, so a band reads left to right in
 * the same order the parts sit on the car. Order, not position: even spacing
 * moves a part sideways from where it came off (the fender leaves at x=469 and
 * parks at x=749), and that is the right trade -- ten parts at their true
 * x-positions would cluster over the nose and leave the tail empty.
 */
function finaleTargets(parts: ReturnType<typeof rawParts>) {
  const bands = finaleBands();
  const usable = HERO_CANVAS - FINALE_MARGIN * 2;
  const targets = new Map<string, { x: number; y: number }>();

  for (const name of ["above", "below"] as const) {
    const band = bands[name];
    const members = FINALE_BAND[name]
      .map((id) => {
        const part = parts.find((candidate) => candidate.id === id);
        if (!part) {
          throw new Error(
            `FINALE_BAND.${name} names "${id}", which is not in the scene. Every parked part ` +
              `must be a real layer, or the finale would reserve room for nothing.`,
          );
        }
        const visual = clipped(part.box, part.clip);
        return { part, visual, scale: FINALE_SCALE[part.group] };
      })
      .sort((a, b) => centre(a.visual).x - centre(b.visual).x);

    const total = members.reduce((sum, m) => sum + m.visual.width * m.scale, 0);
    const gap = (usable - total) / (members.length + 1);
    const middle = (band.top + band.bottom) / 2;

    let cursor = FINALE_MARGIN + gap;
    for (const member of members) {
      const width = member.visual.width * member.scale;
      targets.set(member.part.id, { x: cursor + width / 2, y: middle });
      cursor += width + gap;
    }
  }

  return targets;
}

/**
 * The whole scene with every derived field resolved.
 *
 * Computed once at module scope, like `manifestEntries()`'s own consumers do:
 * this is a pure function of two constants and a build-time-inlined manifest,
 * so recomputing it per render would be work with no possible different answer.
 */
export function sceneParts(): readonly ScenePart[] {
  const parts = rawParts();
  const targets = finaleTargets(parts);
  return parts.map((part) => {
    const visual = clipped(part.box, part.clip);
    const boxMiddle = centre(part.box);
    const visualMiddle = centre(visual);

    const target = targets.get(part.id);
    if (!target) {
      throw new Error(
        `"${part.id}" undocks but has no finale parking spot. Add it to FINALE_BAND -- a part ` +
          `left behind on the car while the other nine explode reads as a bug, not a choice.`,
      );
    }

    // Scale happens about the ELEMENT box's centre, so a clipped part's visible
    // centre moves under it. Solving for the translation that lands the visible
    // centre on the target is what keeps a lamp pointing at its own lens.
    const scale = FINALE_SCALE[part.group];
    const parkedX = boxMiddle.x + (visualMiddle.x - boxMiddle.x) * scale;
    const parkedY = boxMiddle.y + (visualMiddle.y - boxMiddle.y) * scale;

    // Peak scale is taken about the ELEMENT box centre, like every other scale
    // in the scene, so the visible rectangle grows about a point that is not
    // its own centre whenever the part is clipped.
    const peak: CanvasBox = {
      left: boxMiddle.x + (visual.left - boxMiddle.x) * part.undock.scale + part.undock.dx,
      top: boxMiddle.y + (visual.top - boxMiddle.y) * part.undock.scale + part.undock.dy,
      width: visual.width * part.undock.scale,
      height: visual.height * part.undock.scale,
    };
    const band = part.undock.dy < 0 ? ("above" as const) : ("below" as const);

    return {
      id: part.id,
      group: part.group,
      chapter: part.chapter,
      box: part.box,
      visual,
      peak,
      // The undock vector is a straight translation of the whole element, so
      // the visible centre travels with it -- peak scale is taken about the box
      // centre and does not move it.
      anchor: { x: visualMiddle.x + part.undock.dx, y: visualMiddle.y + part.undock.dy },
      // Derived from the direction the part actually travels, never authored.
      // A plate belongs in the clear band the part just moved into, which is
      // the only region guaranteed to be empty -- and because a chapter plays
      // one slot at a time (CHAPTER_SEQUENCE + BEAT_SPAN), two plates can never
      // contend for that space however many parts share a band.
      //
      // This is deliberately NOT the same thing as `FINALE_BAND`, and they
      // disagree for four of the eleven layers. Where a part parks is a packing
      // decision made once, for one beat, with all ten on screen at once; where
      // its label sits is a consequence of that part's own motion, and applies
      // while it is the only thing out. The grille and door leave downward but
      // park above because the upper band has room; both headlights leave
      // upward but park below for the same reason in reverse. Reusing one
      // number for both would put four labels in the wrong half of the stage.
      band,
      finale: { dx: target.x - parkedX, dy: target.y - parkedY, scale },
    };
  });
}

/** The scene keyed by id, for the components that look a single part up. */
export function scenePartById(): ReadonlyMap<string, ScenePart> {
  return new Map(sceneParts().map((part) => [part.id, part]));
}

/**
 * A point in STAGE space, in canvas coordinates.
 *
 * The inverse of `cameraRig.toStageX` / `toStageY`, and it exists for the
 * leader line (P14.S5). The caption plate lives in stage space and the anchor
 * dot lives in canvas space, so a line joining them has to be expressed in one
 * of the two -- and it has to be canvas, because the dot is the end that must
 * stay glued to its part while the camera moves.
 *
 * Both mappings run through the same two constants the frame is drawn from, so
 * a retuned `HERO_FRAME_WIDTH_PCT` moves the plate's target with the frame
 * instead of leaving the line pointing at where the plate used to be. Sanity
 * checks, asserted in `heroScene.test.ts`: (0.5, 0.5) is the canvas centre, and
 * stage y 0 and 1 are exactly `HERO_VISIBLE_ROWS`.
 */
export function stageToCanvas(x: number, y: number): { readonly x: number; readonly y: number } {
  const frameW = HERO_FRAME_WIDTH_PCT / 100;
  // The frame is square, so its height as a fraction of the STAGE is its width
  // fraction times the stage's aspect. Conflating the two axes here is the same
  // mistake `cameraRig` calls out on the way in: one canvas pixel is a
  // different fraction of the stage horizontally and vertically.
  const frameH = frameW * HERO_STAGE_ASPECT;
  return {
    x: ((x - (1 - frameW) / 2) / frameW) * HERO_CANVAS,
    y: ((y - (1 - frameH) / 2) / frameH) * HERO_CANVAS,
  };
}
