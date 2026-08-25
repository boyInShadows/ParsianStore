"use client"; // scroll-linked undock -- useScroll/useTransform need the client

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { landingAsset, landingFallback, landingSrcSet } from "@/lib/landing-image";
import {
  CHAPTER_PEAK,
  CHAPTER_RANGE,
  HERO_BASE_ASSET,
  HERO_CANVAS,
  HERO_FRAME_WIDTH_PCT,
  HERO_LAYERS,
  HERO_PERSPECTIVE_CQW,
  type HeroClip,
  type HeroDock,
  type HeroLayer,
} from "./heroLayout";

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
    zIndex: index + 2,
  };
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
  const [from, to] = CHAPTER_RANGE[layer.chapter];
  const peak = from + (to - from) * CHAPTER_PEAK;
  const beat = [from, peak, to];

  /** Docked -> lifted -> docked, for a value that is zero at rest. */
  const lift = (value: number) => [`0%`, `${value.toFixed(2)}%`, `0%`];
  /** The mirror image, for a rotation that is non-zero at rest and unwinds. */
  const unwind = (value: number) => [value, 0, value];

  const x = useTransform(progress, beat, lift((layer.undock.dx / box.width) * 100));
  const y = useTransform(progress, beat, lift((layer.undock.dy / box.height) * 100));
  const scale = useTransform(progress, beat, [1, layer.undock.scale, 1]);
  const rotateX = useTransform(progress, beat, unwind(layer.dock.rotateX ?? 0));
  const rotateY = useTransform(progress, beat, unwind(layer.dock.rotateY ?? 0));
  const rotateZ = useTransform(progress, beat, unwind(layer.dock.rotateZ ?? 0));

  return (
    <motion.img
      {...layerImageProps(box)}
      className="absolute"
      style={{ ...layerStyle(box, layer, index), x, y, scale, rotateX, rotateY, rotateZ }}
    />
  );
}

/** The same layer with no motion attached: the dock, and nothing else. */
function DockedLayer({ layer, index }: { layer: HeroLayer; index: number }) {
  const box = place(layer.asset, layer.dock);
  return (
    <img
      {...layerImageProps(box)}
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
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Bound to the TRACK, not the stage. The stage is pinned, so its own box
  // stops moving and could never drive anything; the track is what scrolls.
  // ["start start", "end end"] makes the travel exactly the track's height minus
  // one viewport -- and since the track is `100vh + X`, that travel is exactly X
  // at every breakpoint instead of a number that shifts with window size.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const base = place(HERO_BASE_ASSET, { dx: 0, dy: 0, scale: 1 });

  return (
    // The track only exists to buy scroll distance: `100vh` keeps the pinned
    // stage on screen for a full viewport, and the extra is the distance the
    // three chapters play over. Reduced motion and no-JS collapse both this and
    // the pin back to nothing (globals.css) -- an empty screen-height spacer
    // would be pure dead scroll for a visitor who never sees the motion.
    <div
      ref={trackRef}
      className="hero-track relative min-h-[calc(100vh+14rem)] lg:min-h-[calc(100vh+34rem)]"
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
