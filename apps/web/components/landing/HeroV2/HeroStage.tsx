"use client"; // scroll-linked undock -- useScroll/useTransform need the client

import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useHeroScroll } from "./HeroScrollProvider";
import { landingAsset, landingFallback, landingSrcSet } from "@/lib/landing-image";
import { cameraTrack } from "./cameraRig";
import { scenePartById } from "./heroScene";
import { calloutSubjectByLayerId } from "./manifestData";
import {
  beatOf,
  HERO_BASE_ASSET,
  HERO_CAMERA_PERSPECTIVE_CQW,
  HERO_CANVAS,
  HERO_ENGINE_CHAPTER,
  HERO_ENGINE_PARTS,
  HERO_FRAME_WIDTH_PCT,
  HERO_LAYERS,
  HERO_PERSPECTIVE_CQW,
  FINALE_BEAT,
  FINALE_DRIFT,
  type HeroClip,
  type HeroDock,
  type HeroEnginePart,
  type HeroLayer,
  type HeroPartPlacement,
} from "./heroLayout";

/**
 * The engine parts' own stacking level: above the base car (1), below every
 * sprite. That ordering is the whole trick of the beat -- the docked hood
 * covers the bay completely, so the page still opens with a closed car, and the
 * parts are revealed by the hood leaving rather than by fading in.
 */
const ENGINE_PART_Z = 2;

type Props = {
  /** Accessible name for the whole diagram. */
  label: string;
  /** Alt text for the assembled vehicle the layers add up to. */
  carAlt: string;
  /** "Scroll to separate the parts" -- pinned with the stage, so it is on
   *  screen for exactly as long as the invitation is true. */
  hint: string;
  /**
   * Beat 0's narration -- "this car is built from the very parts we stock"
   * (P14.S3).
   *
   * It used to be a page paragraph above the stage, and it was the single
   * cheapest thing to cut from the first screen: measured at 1440x900 it and
   * its gap cost 122px of the space between the header and the car. It is not
   * page copy though -- it describes the drawing -- so it moves *into* the
   * stage as the caption of the beat before any part has moved, at the same
   * slot and by the same `data-callout`/`data-shown` mechanism as every other
   * caption. It shares `__hint`'s id with the scroll invitation because the two
   * are the same beat; `StageNarration` needs no new branch for it.
   *
   * A plain string, not a `ReactNode`: unlike the plates there is no markup to
   * keep on the server, and taking the text lets the stage own where it sits.
   */
  lead: string;
  /**
   * The server-rendered callout layer (P13.S3), passed in as a slot.
   *
   * This component is a Client Component, so it cannot render an async Server
   * Component itself -- but it can receive one as a prop from its server
   * parent, which is what keeps ten plates of text and links out of the route's
   * JavaScript. It renders OUTSIDE the camera: a caption measured in canvas
   * pixels is magnified and clipped by the camera, which is what chapter 1's
   * push-in did to the first version of it.
   */
  callouts?: ReactNode;
  /**
   * The headlights' glow, which unlike the captions belongs in canvas space --
   * it is light on a lamp, so it must move with the lamp.
   */
  bloom?: ReactNode;
  /**
   * The finale's CTA (P13.S8) -- pinned with the stage, but outside its box.
   *
   * Separate from `callouts` because it is not part of the diagram: it must not
   * scale, tilt or clip with the camera, and the only clear space inside the
   * frame at the finale is where the ten parked parts are.
   */
  finale?: ReactNode;
  /**
   * The job card (P13.S7), rendered INSIDE the pinned block.
   *
   * That placement is the whole point of the step. It used to render twice --
   * a sticky panel in the copy column and a chip rail under the stage --
   * because one element could not be in two grid cells, and
   * `docs/performance-landing.md` measured that duplication as the entire
   * Phase 12 TBT regression. Inside the pin it is one node in one place, laid
   * out as a column beside the stage at `lg` and a strip under it below.
   *
   * It also fixes what the audit actually complained about: the card is now
   * pinned with the drawing, so it is on screen for every beat instead of
   * sitting below the fold until the animation has finished.
   */
  manifest?: ReactNode;
  /**
   * Station-to-station controls (P13.S11): the keyboard's equivalent of a
   * scroll gesture, for an animation that is otherwise pointer-only.
   */
  steps?: ReactNode;
};

/** Roughly how wide the stage itself is, for `sizes`. */
const STAGE_VW = { desktop: 55, mobile: 92 } as const;

const pct = (value: number) => `${((value / HERO_CANVAS) * 100).toFixed(4)}%`;

/**
 * Where a layer's box lands on the canvas, from the trim offsets the pipeline
 * recorded plus this layer's calibration.
 *
 * The scale is taken about the box's own centre -- `(intrinsic - scaled) / 2`
 * is that recentring. Scaling from the top-left corner instead would drag every
 * resized part up and to the start side, which is what makes a "just make it
 * smaller" nudge move a part that was already in the right place.
 */
function place(assetName: string, dock: HeroDock) {
  const asset = landingAsset(`/landing/hero/${assetName}`);
  if (!asset.trim) {
    throw new Error(
      `Hero layer "${assetName}" is untrimmed, so it carries no registration. ` +
        `Re-run \`pnpm optimize:landing\` -- the hero group must trim (scripts/optimize-landing.mjs).`,
    );
  }
  const width = asset.intrinsic.width * dock.scale;
  const height = asset.intrinsic.height * dock.scale;
  return {
    asset,
    width,
    height,
    left: asset.trim.left + (asset.intrinsic.width - width) / 2 + dock.dx,
    top: asset.trim.top + (asset.intrinsic.height - height) / 2 + dock.dy,
  };
}

/** The layer's rendered width in viewport terms, so `srcset` picks a real rung. */
function sizesFor(width: number) {
  const share = (width / HERO_CANVAS) * (HERO_FRAME_WIDTH_PCT / 100);
  const desktop = Math.max(1, Math.round(share * STAGE_VW.desktop));
  const mobile = Math.max(1, Math.round(share * STAGE_VW.mobile));
  return `(min-width: 1024px) ${desktop}vw, ${mobile}vw`;
}

function transformFor(dock: HeroDock) {
  // Always all three, always in this order: the undock interpolates between two
  // transform strings, and the browser only interpolates them componentwise
  // when the function lists match.
  return (
    `rotateX(${dock.rotateX ?? 0}deg) ` +
    `rotateY(${dock.rotateY ?? 0}deg) ` +
    `rotateZ(${dock.rotateZ ?? 0}deg)`
  );
}

function clipFor(clip: HeroClip | undefined) {
  return clip ? `inset(${clip.top}% ${clip.right}% ${clip.bottom}% ${clip.left}%)` : undefined;
}

function layerStyle(box: ReturnType<typeof place>, layer: HeroLayer, index: number) {
  return {
    insetInlineStart: pct(box.left),
    top: pct(box.top),
    width: pct(box.width),
    height: "auto" as const,
    clipPath: clipFor(layer.clip),
    zIndex: index + ENGINE_PART_Z + 1,
  };
}

/**
 * Where an engine part's box lands, from its placement and its own aspect ratio.
 *
 * Deliberately not `place()`. That function starts from `asset.trim` -- the
 * coordinate the part was cut from -- and a catalogue product shot has no such
 * coordinate to start from, so it throws for exactly these assets. Here the
 * placement *is* the position.
 */
function placePart(assetName: string, placement: HeroPartPlacement) {
  const asset = landingAsset(`/landing/hero-parts/${assetName}`);
  const height = placement.height;
  const width = height * (asset.intrinsic.width / asset.intrinsic.height);
  return {
    asset,
    width,
    height,
    left: placement.cx - width / 2,
    top: placement.cy - height / 2,
  };
}

/**
 * Which part a sprite belongs to, stamped on the element as `data-part`.
 *
 * This is the entire coupling between the diagram and everything that talks
 * about it: the manifest row, the highlight, and now the callout all pair
 * through this one attribute without any of them knowing the others exist
 * (P12.S4).
 *
 * It reads the **callout subjects** rather than the manifest rows as of
 * P13.S3, and the windshield is the difference. It has no row -- there is no
 * glass category to sell it from -- so under the old mapping it was the one
 * sprite on the stage with no identity: it could not highlight, and its own
 * caption's leader line had nothing to point at. Being un-sellable and being
 * un-nameable are different things, and only the first is true of it.
 */
const partByLayer = calloutSubjectByLayerId();

function partAttr(layerId: string) {
  const entry = partByLayer.get(layerId);
  return entry ? { "data-part": entry.id } : {};
}

function layerImageProps(box: ReturnType<typeof place>) {
  return {
    src: landingFallback(box.asset),
    srcSet: landingSrcSet(box.asset),
    sizes: sizesFor(box.width),
    width: box.asset.intrinsic.width,
    height: box.asset.intrinsic.height,
    alt: "",
    loading: "eager" as const,
    decoding: "async" as const,
  };
}

/**
 * The chapter beat and the finale, crossfaded into one transform (P13.S8).
 *
 * Every value is a percentage of the part's OWN box, which is what lets a
 * single element carry the whole transform — so the finale's canvas-pixel
 * vector from `heroScene` is converted here rather than there, where the box is
 * not known.
 *
 * The drift is the difference between "parked" and "frozen". Nine parts holding
 * perfectly still for 6% of the track is the one genuinely dead stretch the
 * scroll would otherwise have, and it lands on the beat the visitor is meant to
 * stop and read. It is driven by scroll position rather than by time, like
 * everything else here, so it scrubs both ways and costs no animation frame.
 */
function useFinale(
  id: string,
  box: { width: number; height: number },
  driftAngle: MotionValue<number>,
  mix: MotionValue<number>,
  chapter: {
    chapterX: MotionValue<number>;
    chapterY: MotionValue<number>;
    chapterScale: MotionValue<number>;
  },
) {
  const part = SCENE_BY_ID.get(id);
  if (!part) {
    throw new Error(
      `Hero layer "${id}" is on the stage but not in the solved scene, so it has no parking ` +
        `spot for the finale. Every layer must reach heroScene.sceneParts().`,
    );
  }

  const finaleX = (part.finale.dx / box.width) * 100;
  const finaleY = (part.finale.dy / box.height) * 100;
  const driftPct = (FINALE_DRIFT.amplitude / box.height) * 100;
  // A phase per part, from the id, so nine parts do not bob in unison — which
  // would read as the whole stage breathing rather than nine things suspended.
  const phase = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const blend = (from: number, to: number, m: number) => from * (1 - m) + to * m;

  // The explicit multi-input form, not `useTransform(() => ...)`.
  //
  // The closure form was the first cut and it shipped a real bug. The blend read
  // `mix` inside a nested helper, and motion's implicit dependency tracking did
  // not reliably re-run the transform when only `mix` changed -- so at the end
  // of the track every part rendered a state about ten pixels of scroll stale,
  // and the car did NOT finish docked. That is the one promise Gate B is built
  // on, and it failed intermittently, which is the worst way for it to fail.
  // Naming the inputs takes the guess out of it.
  return {
    x: useTransform(
      [chapter.chapterX, mix],
      ([cx, m]: number[]) => `${blend(cx ?? 0, finaleX, m ?? 0).toFixed(3)}%`,
    ),
    y: useTransform([chapter.chapterY, mix, driftAngle], ([cy, m, angle]: number[]) => {
      const drift = Math.sin((angle ?? 0) + phase) * driftPct * (m ?? 0);
      return `${(blend(cy ?? 0, finaleY, m ?? 0) + drift).toFixed(3)}%`;
    }),
    scale: useTransform([chapter.chapterScale, mix], ([cs, m]: number[]) =>
      blend(cs ?? 1, part.finale.scale, m ?? 0),
    ),
  };
}

/**
 * One part, lifting away from the car and settling back over its chapter.
 *
 * Out and back, not out and gone. `[from, peak, to] -> [0, 1, 0]` is the whole
 * shape: the group rises, hangs at the top of its beat, and re-docks before the
 * next chapter opens, so the car is a car again at every rest point including
 * the end of the scroll.
 *
 * The translation is expressed in percentages of the part's OWN box rather than
 * of the stage, which is why one element can carry the whole transform. Written
 * as a stage percentage it would need a wrapper to measure against, and the
 * rotation below would then be applied about the wrong origin.
 *
 * Rotations run the other way -- dock value toward 0. They exist only to sit a
 * neutral product shot on a car photographed at an angle; a part in mid-air owes
 * the car nothing, so as it leaves it turns to face the viewer.
 */
function PartLayer({
  layer,
  index,
  progress,
  finaleMix,
  driftAngle,
}: {
  layer: HeroLayer;
  index: number;
  progress: MotionValue<number>;
  finaleMix: MotionValue<number>;
  driftAngle: MotionValue<number>;
}) {
  const box = place(layer.asset, layer.dock);
  // This layer's own span inside the chapter, not the chapter's (P12.S6). Four
  // keyframes: docked, peak, still at peak, docked again.
  const beat = beatOf(layer.chapter, layer.id);

  /** Docked -> lifted -> HELD -> docked, for a value that is zero at rest. */
  const lift = (value: number) => [0, value, value, 0];
  /** The mirror image, for a rotation that is non-zero at rest and unwinds. */
  const unwind = (value: number) => [value, 0, 0, value];

  const chapterX = useTransform(progress, beat, lift((layer.undock.dx / box.width) * 100));
  const chapterY = useTransform(progress, beat, lift((layer.undock.dy / box.height) * 100));
  const chapterScale = useTransform(progress, beat, [1, layer.undock.scale, layer.undock.scale, 1]);

  const { x, y, scale } = useFinale(layer.id, box, driftAngle, finaleMix, {
    chapterX,
    chapterY,
    chapterScale,
  });
  const rotateX = useTransform(progress, beat, unwind(layer.dock.rotateX ?? 0));
  const rotateY = useTransform(progress, beat, unwind(layer.dock.rotateY ?? 0));
  const rotateZ = useTransform(progress, beat, unwind(layer.dock.rotateZ ?? 0));

  return (
    <motion.img
      {...layerImageProps(box)}
      {...partAttr(layer.id)}
      className="absolute"
      style={{ ...layerStyle(box, layer, index), x, y, scale, rotateX, rotateY, rotateZ }}
    />
  );
}

/**
 * An engine part rising out of the bay, on the hood's own beat.
 *
 * Same out-and-back shape as `PartLayer`, minus the rotations: a hero sprite
 * carries a dock rotation that unwinds as it leaves, because it was calibrated
 * to sit on a car photographed at an angle. These were never seated on the car
 * at all, so there is nothing to unwind.
 */
function EnginePartLayer({
  part,
  progress,
  finaleMix,
  driftAngle,
}: {
  part: HeroEnginePart;
  progress: MotionValue<number>;
  finaleMix: MotionValue<number>;
  driftAngle: MotionValue<number>;
}) {
  const box = placePart(part.asset, part.place);
  // Its own slot inside the hood's open window -- the lid is chapter 2's
  // cover, not one of its beats, so every part here plays while it is up.
  const beat = beatOf(HERO_ENGINE_CHAPTER, part.id);
  const lift = (value: number) => [0, value, value, 0];

  const chapterX = useTransform(progress, beat, lift((part.undock.dx / box.width) * 100));
  const chapterY = useTransform(progress, beat, lift((part.undock.dy / box.height) * 100));
  const chapterScale = useTransform(progress, beat, [1, part.undock.scale, part.undock.scale, 1]);

  const { x, y, scale } = useFinale(part.id, box, driftAngle, finaleMix, {
    chapterX,
    chapterY,
    chapterScale,
  });

  return (
    <motion.img
      {...layerImageProps(box)}
      {...partAttr(part.id)}
      className="absolute"
      style={{
        insetInlineStart: pct(box.left),
        top: pct(box.top),
        width: pct(box.width),
        height: "auto",
        zIndex: ENGINE_PART_Z,
        x,
        y,
        scale,
      }}
    />
  );
}

/**
 * The docked engine part: under a closed hood, and therefore invisible.
 *
 * It is still rendered rather than skipped. Reduced motion gets the same DOM as
 * everyone else, so nothing depends on which branch ran, and the hood is what
 * hides it -- exactly as it does for a visitor who simply has not scrolled yet.
 */
function DockedEnginePart({ part }: { part: HeroEnginePart }) {
  const box = placePart(part.asset, part.place);
  return (
    <img
      {...layerImageProps(box)}
      {...partAttr(part.id)}
      className="absolute"
      style={{
        insetInlineStart: pct(box.left),
        top: pct(box.top),
        width: pct(box.width),
        height: "auto",
        zIndex: ENGINE_PART_Z,
      }}
    />
  );
}

/**
 * Computed once. `cameraTrack()` is a pure function of two constants and a
 * build-time-inlined asset manifest, so recomputing it per render would be work
 * with no possible different answer -- and this runs inside a Client Component
 * on a route already over its JS budget.
 */
const CAMERA_TRACK = cameraTrack();

/** The solved scene, computed once for the same reason the camera track is. */
const SCENE_BY_ID = scenePartById();

/**
 * How much of the finale is showing, 0 to 1 (P13.S8).
 *
 * A **blend**, not a second translation added on top of the chapter beat, and
 * the overlap is why. Chapter 3's last slot runs 0.854 to 0.980 and the finale
 * runs 0.860 to 1.000, so for almost all of the windshield's beat both are
 * live. Adding them would put the windshield at its parking spot *plus* its
 * chapter lift -- a coordinate neither transform ever meant, and one no test
 * of either would have caught, because each is correct on its own.
 *
 * So the finale crossfades over the chapter: as the mix rises the chapter's
 * contribution falls away and the parking position takes over. It returns to
 * zero by p=1, which is Gate B -- the exploded catalogue is the climax, and
 * the car the visitor scrolls away from is whole again.
 */
function useFinaleMix(progress: MotionValue<number>) {
  return useTransform(progress, [...FINALE_BEAT], [0, 1, 1, 0]);
}

/**
 * The drift's phase angle, one hop from scroll progress.
 *
 * It exists as its own value rather than being computed from `progress` inside
 * the y transform, and the reason is the shape of the dependency graph. `mix`
 * is derived from `progress`; a transform that reads *both* `progress` and
 * `mix` sits one hop from the first and two from the second, so it recomputes
 * as soon as progress changes -- using the previous frame's `mix`. That is a
 * value one scroll event stale, and it was: x and scale (which read only
 * `mix`) landed correctly at the end of the track while y did not, leaving the
 * parts a step short of docked. Keeping every input to y exactly one hop from
 * progress puts them all on the same tick.
 */
function useDriftAngle(progress: MotionValue<number>) {
  return useTransform(progress, (value) => value * FINALE_DRIFT.cycles);
}

/**
 * The camera: one wrapper, one transform, the whole scene inside it (P13.S2).
 *
 * It is a separate element from the frame rather than a transform on it, and
 * that is not a stylistic choice. The frame carries
 * `transform: translate(-50%, -50%)` for its own centring; motion composes its
 * own transform string from `x`/`y`/`scale`, so writing the camera onto the
 * frame would overwrite that and throw the car into the corner the first time
 * the camera moved. `.hero-camera` is `inset-0` -- the same box as the stage --
 * so the frame's 50% centring resolves against an identical rectangle and every
 * canvas coordinate in this file is unchanged.
 *
 * **No `will-change`.** The plan asked for one, toggled on pin. Motion already
 * promotes an element it is animating a transform on, so the attribute would
 * buy nothing during the move and cost a permanent compositor layer wrapping
 * eleven images the rest of the time -- on a route already 61ms over its TBT
 * budget. If P13.S13 measures a real cost here, it can be added there with a
 * number attached rather than on the assumption that it helps.
 */
function HeroCamera({
  progress,
  still,
  children,
}: {
  progress: MotionValue<number>;
  still: boolean;
  children: ReactNode;
}) {
  const scale = useTransform(progress, CAMERA_TRACK.input, CAMERA_TRACK.scale);
  const x = useTransform(progress, CAMERA_TRACK.input, CAMERA_TRACK.x);
  const y = useTransform(progress, CAMERA_TRACK.input, CAMERA_TRACK.y);
  const rotateX = useTransform(progress, CAMERA_TRACK.input, CAMERA_TRACK.rotateX);
  const rotateZ = useTransform(progress, CAMERA_TRACK.input, CAMERA_TRACK.rotateZ);

  // Reduced motion gets the neutral framing and no subscription at all -- the
  // same shape as the layers below, where the docked composite is already the
  // correct finished picture rather than a degraded one.
  if (still) return <div className="hero-camera absolute inset-0">{children}</div>;

  return (
    <motion.div className="hero-camera absolute inset-0" style={{ scale, x, y, rotateX, rotateZ }}>
      {children}
    </motion.div>
  );
}

/** The same layer with no motion attached: the dock, and nothing else. */
function DockedLayer({ layer, index }: { layer: HeroLayer; index: number }) {
  const box = place(layer.asset, layer.dock);
  return (
    <img
      {...layerImageProps(box)}
      {...partAttr(layer.id)}
      className="absolute"
      style={{ ...layerStyle(box, layer, index), transform: transformFor(layer.dock) }}
    />
  );
}

/**
 * The hero's vehicle: a stripped body with seven parts docked back onto it, so
 * what the page opens with is a *complete* car (fableTasks §3.2), which comes
 * apart group by group as the hero scrolls past.
 *
 * `dir="ltr"` on the stage is deliberate and is not a physical-direction
 * violation (CLAUDE.md §6): every layer is positioned with `insetInlineStart`,
 * and the renders are never mirrored, so in Persian the sprites would mirror
 * around a car that does not -- a bumper docking onto the rear. The car is an
 * object, not text, so the object's own frame is pinned while the page around
 * it stays RTL.
 *
 * Reduced motion renders `DockedLayer` and never subscribes to scroll at all.
 * Note what that means for the CSS backstop: the docked composite is already
 * the correct, finished picture, so `globals.css` must NOT clear these
 * transforms the way it did for the v1 stage -- clearing them would undock
 * every sprite. It collapses the track and unpins the stage, and leaves the
 * layers alone.
 */
export function HeroStage({
  label,
  carAlt,
  hint,
  lead,
  callouts,
  bloom,
  finale,
  manifest,
  steps,
}: Props) {
  const reduceMotion = useReducedMotion();
  // The measurement itself lives in HeroScrollProvider so the parts manifest,
  // which renders in the other grid column, reads the same value (P12.S4).
  const { trackRef, progress: scrollYProgress } = useHeroScroll();
  const base = place(HERO_BASE_ASSET, { dx: 0, dy: 0, scale: 1 });
  // One mix for the whole scene: eleven copies of the same interpolation would
  // be eleven subscriptions to one number.
  const finaleMix = useFinaleMix(scrollYProgress);
  const driftAngle = useDriftAngle(scrollYProgress);

  return (
    // The track only exists to buy scroll distance: `100vh` keeps the pinned
    // stage on screen for a full viewport, and the extra is the distance the
    // three chapters play over. Reduced motion and no-JS collapse both this and
    // the pin back to nothing (globals.css) -- an empty screen-height spacer
    // would be pure dead scroll for a visitor who never sees the motion.
    <div
      ref={trackRef}
      // 56rem / 120rem, up from 14 / 34 (P12.S6). Staggering the slots is only
      // half of "the separation is not legible": the other half was that the
      // whole three-chapter sequence played out over 544px of scroll on a
      // desktop, so nine parts got about 60px each and one trackpad flick ran
      // the entire hero. A slot's beat is 13.4% of the track (BEAT_SPAN x the
      // chapter span), which is 257px here -- about 0.9s at an unhurried
      // ~300px/s scroll, the "one second per frame" this always wanted to be.
      // 72rem on mobile, up from 56rem (P13.S7). Four beats now play here
      // rather than three, and 56rem gave each station well under the 1.5
      // viewport-heights the plan asks for -- on a 844px-tall phone the whole
      // sequence ran in about two flicks.
      // `order-2 lg:order-none` is the hero column's mobile ordering (P14.S3),
      // declared here because this element is the stage's cell in it. See
      // HeroV2 for why every sibling carries one.
      className="hero-track relative order-2 min-h-[calc(100vh+72rem)] lg:order-none lg:min-h-[calc(100vh+120rem)]"
    >
      {/* Stage and job card share the pinned block: side by side from `lg`,
          stacked below it. One grid, so the card is pinned with the drawing at
          every width instead of waiting below the fold. `min-w-0` on both
          cells because the card is a horizontal scroller below `lg` and a grid
          item's automatic minimum size is its min-content width -- without it
          the rail refuses to shrink and overflows the phone. */}
      <div className="hero-pin sticky top-24 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          <div
            role="group"
            aria-label={label}
            dir="ltr"
            // `overflow-x-clip`, and only x. A push-in translates the frame
            // sideways to bring the nose to the middle of the stage, so at
            // chapter 1's 1.35 the frame runs well past both edges -- without
            // this it spills over the copy column beside it. The y axis stays
            // `visible` because vertical spill is load-bearing: the frame is
            // already taller than the stage, and the bands parts undock into are
            // outside the stage box by design. `clip` is what allows that pair;
            // `hidden` on one axis would force the other to `auto` and give the
            // stage a scrollbar.
            // `bg-stage`, not a theme surface, and that is the deliberate
            // half of P14.S2. Every sprite in here was rendered against a dark
            // ground: a light stage would show cut edges and dark drop
            // shadows on white. So the stage does not follow the theme -- it
            // becomes a FRAMED stage instead. The section around it is
            // `bg-bg` and flips; the plate keeps its workshop ground and gains
            // a 1px `--border` edge and a radius, which is what tells a
            // light-mode reader that the dark box is a picture rather than a
            // section that forgot to switch.
            className="hero-stage relative aspect-[16/11] w-full overflow-x-clip rounded-lg border border-border bg-stage"
            style={{
              // The container-query context the frame's `perspective` measures
              // against.
              containerType: "inline-size",
              // The camera's own vanishing point (P13.S2). Two nested
              // perspectives, deliberately: this one is the room the camera moves
              // in, and the frame's is the one the sprites share. Putting the
              // camera's rotateX under the frame's perspective instead would tilt
              // the car relative to its own layers rather than tilt the view.
              perspective: `${HERO_CAMERA_PERSPECTIVE_CQW}cqw`,
            }}
          >
            {/* `useReducedMotion` is `boolean | null` -- null until it has read the
              media query. Null means "not yet known to prefer reduced", which is
              the same branch as false everywhere else in this file. */}
            <HeroCamera progress={scrollYProgress} still={Boolean(reduceMotion)}>
              {/* The 1024² master frame, centred in the camera -- which is the
                same box as the stage, so every percentage below is unchanged
                from before the camera existed. Every layer inside is positioned
                as a percentage of THIS box, which is what makes the trim offsets
                the pipeline recorded usable as dock coordinates.

                `perspective` belongs here and nowhere else: one shared camera for
                all eight layers. Written per layer it would give each sprite its own
                vanishing point, and the composite would stop reading as one car. */}
              <div
                className="absolute aspect-square"
                style={{
                  insetInlineStart: "50%",
                  top: "50%",
                  width: `${HERO_FRAME_WIDTH_PCT}%`,
                  transform: "translate(-50%, -50%)",
                  perspective: `${HERO_PERSPECTIVE_CQW}cqw`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* The floor the car stands on, and the light that arrives with
                  it (P13.S5). Both sit inside the frame, so they share the
                  sprites' coordinates and move with the camera; both are
                  decorative and paint below every part. */}
                <div className="hero-floor" aria-hidden="true" />
                <div
                  className="hero-sweep"
                  aria-hidden="true"
                  style={
                    {
                      // Masked by the stripped body's own render, so the light
                      // falls on the car rather than on the empty stage around
                      // it. Same file the base image already loaded, so the mask
                      // costs no second request.
                      "--hero-sweep-mask": `url(${landingFallback(base.asset)})`,
                      insetInlineStart: pct(base.left),
                      top: pct(base.top),
                      width: pct(base.width),
                      height: pct(base.height),
                    } as CSSProperties
                  }
                />
                <img
                  src={landingFallback(base.asset)}
                  srcSet={landingSrcSet(base.asset)}
                  sizes={sizesFor(base.width)}
                  width={base.asset.intrinsic.width}
                  height={base.asset.intrinsic.height}
                  alt={carAlt}
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  className="absolute"
                  style={{
                    insetInlineStart: pct(base.left),
                    top: pct(base.top),
                    width: pct(base.width),
                    height: "auto",
                    zIndex: 1,
                  }}
                />
                {HERO_ENGINE_PARTS.map((part) =>
                  reduceMotion ? (
                    <DockedEnginePart key={part.id} part={part} />
                  ) : (
                    <EnginePartLayer
                      key={part.id}
                      part={part}
                      progress={scrollYProgress}
                      finaleMix={finaleMix}
                      driftAngle={driftAngle}
                    />
                  ),
                )}
                {HERO_LAYERS.map((layer, index) =>
                  reduceMotion ? (
                    <DockedLayer key={layer.id} layer={layer} index={index} />
                  ) : (
                    <PartLayer
                      key={layer.id}
                      layer={layer}
                      index={index}
                      progress={scrollYProgress}
                      finaleMix={finaleMix}
                      driftAngle={driftAngle}
                    />
                  ),
                )}
                {/* Inside the frame, because the glow has to sit on the lamp:
                  a percentage resolves against the nearest positioned
                  ancestor, and as a sibling of the frame it would measure
                  against the stage's 814x560 box instead of the frame's 749
                  square -- up to 40px off, and close enough to look right in a
                  screenshot. */}
                {bloom}
              </div>
            </HeroCamera>
            {/* Outside the camera, deliberately: a caption in canvas space is
              scaled by the camera and clipped by it, which is exactly what
              chapter 1's push-in did to the first version. See PartCallout. */}
            {callouts}
            {/* Beat 0's narration, in the stage's lower band (P14.S3).
                `dir="rtl"` because the stage box is `dir="ltr"` -- that is
                correct for a diagram whose coordinates are LTR percentages,
                and wrong for three lines of Persian prose inside it, which
                need their own paragraph direction to break and align. It is
                the one long run of copy in here; the plates are short enough
                that the difference does not show. */}
            <p className="hero-lead text-caption" data-callout="__hint" dir="rtl">
              {lead}
            </p>
          </div>
          {/* The invitation, and only while it is true (P13.S7). It used to be
              a permanent <p> under the stage, still reading "scroll to separate
              the parts" after the last chapter had played and the car had
              re-docked -- the audit's first finding names it. It is beat 0 now:
              shown until the first part moves, then never again. */}
          <p
            // Outside the stage box, so it takes page-theme ink rather than
            // stage ink -- same for the finale CTA and the station buttons
            // below it, and for the job card beside it.
            className="hero-hint font-mono text-caption text-text-muted motion-reduce:hidden"
            data-callout="__hint"
          >
            {hint}
          </p>
          {finale}
          {steps}
        </div>
        {manifest}
      </div>
    </div>
  );
}
