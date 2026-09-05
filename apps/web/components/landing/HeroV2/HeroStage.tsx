"use client"; // scroll-linked undock -- useScroll/useTransform need the client

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useHeroScroll } from "./HeroScrollProvider";
import { landingAsset, landingFallback, landingSrcSet } from "@/lib/landing-image";
import { manifestPartByLayerId } from "./manifestData";
import {
  beatOf,
  HERO_BASE_ASSET,
  HERO_CANVAS,
  HERO_ENGINE_CHAPTER,
  HERO_ENGINE_PARTS,
  HERO_FRAME_WIDTH_PCT,
  HERO_LAYERS,
  HERO_PERSPECTIVE_CQW,
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
 * Which manifest row a sprite belongs to, stamped on the element as `data-part`.
 *
 * This is the entire coupling between the diagram and the manifest: both ends
 * carry the same `data-part`, so the highlight can pair them without either
 * component knowing the other exists (P12.S4). Layers with no row -- the
 * windshield -- get nothing, and simply never highlight.
 */
const partByLayer = manifestPartByLayerId();

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
}: {
  layer: HeroLayer;
  index: number;
  progress: MotionValue<number>;
}) {
  const box = place(layer.asset, layer.dock);
  // This layer's own span inside the chapter, not the chapter's (P12.S6). Four
  // keyframes: docked, peak, still at peak, docked again.
  const beat = beatOf(layer.chapter, layer.id);

  /** Docked -> lifted -> HELD -> docked, for a value that is zero at rest. */
  const lift = (value: number) => {
    const at = `${value.toFixed(2)}%`;
    return ["0%", at, at, "0%"];
  };
  /** The mirror image, for a rotation that is non-zero at rest and unwinds. */
  const unwind = (value: number) => [value, 0, 0, value];

  const x = useTransform(progress, beat, lift((layer.undock.dx / box.width) * 100));
  const y = useTransform(progress, beat, lift((layer.undock.dy / box.height) * 100));
  const scale = useTransform(progress, beat, [1, layer.undock.scale, layer.undock.scale, 1]);
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
}: {
  part: HeroEnginePart;
  progress: MotionValue<number>;
}) {
  const box = placePart(part.asset, part.place);
  // Its own slot inside the hood's open window -- the lid is chapter 2's
  // cover, not one of its beats, so every part here plays while it is up.
  const beat = beatOf(HERO_ENGINE_CHAPTER, part.id);
  const lift = (value: number) => {
    const at = `${value.toFixed(2)}%`;
    return ["0%", at, at, "0%"];
  };

  const x = useTransform(progress, beat, lift((part.undock.dx / box.width) * 100));
  const y = useTransform(progress, beat, lift((part.undock.dy / box.height) * 100));
  const scale = useTransform(progress, beat, [1, part.undock.scale, part.undock.scale, 1]);

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
export function HeroStage({ label, carAlt, hint }: Props) {
  const reduceMotion = useReducedMotion();
  // The measurement itself lives in HeroScrollProvider so the parts manifest,
  // which renders in the other grid column, reads the same value (P12.S4).
  const { trackRef, progress: scrollYProgress } = useHeroScroll();
  const base = place(HERO_BASE_ASSET, { dx: 0, dy: 0, scale: 1 });

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
      className="hero-track relative min-h-[calc(100vh+56rem)] lg:min-h-[calc(100vh+120rem)]"
    >
      <div className="hero-pin sticky top-24 flex flex-col gap-6">
        <div
          role="group"
          aria-label={label}
          dir="ltr"
          className="hero-stage relative aspect-[16/11] w-full"
          // The container-query context the frame's `perspective` measures against.
          style={{ containerType: "inline-size" }}
        >
          {/* The 1024² master frame, centred in the stage. Every layer inside is
              positioned as a percentage of THIS box, which is what makes the trim
              offsets the pipeline recorded usable as dock coordinates.

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
                <EnginePartLayer key={part.id} part={part} progress={scrollYProgress} />
              ),
            )}
            {HERO_LAYERS.map((layer, index) =>
              reduceMotion ? (
                <DockedLayer key={layer.id} layer={layer} index={index} />
              ) : (
                <PartLayer key={layer.id} layer={layer} index={index} progress={scrollYProgress} />
              ),
            )}
          </div>
        </div>
        <p className="font-mono text-caption text-graphite-400 motion-reduce:hidden">{hint}</p>
      </div>
    </div>
  );
}
