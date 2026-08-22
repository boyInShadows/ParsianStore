"use client"; // scroll-linked transforms -- useScroll/useTransform need the client

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { LandingImage } from "../LandingImage";
import {
  CHAPTER_RANGE,
  COLLAPSED_OPACITY,
  COLLAPSED_SCALE,
  HERO_CAR,
  HERO_PARTS,
  type HeroPart,
} from "./heroLayout";

type Props = {
  /** Accessible name for the whole diagram. */
  label: string;
  /** Alt text for the assembled vehicle at the centre of the stage. */
  carAlt: string;
  /** "Scroll to separate the parts" -- pinned with the stage, so it is on screen
   *  for exactly as long as the invitation is true. */
  hint: string;
};

/** Stage-percentage translate that puts a part exactly on the car once the
 *  collapsed scale is applied about the stage centre. */
function collapsed(carPct: number, partPct: number): number {
  return Number((COLLAPSED_SCALE * (carPct - partPct)).toFixed(3));
}

/**
 * One part layer. The wrapper is inset-0, so a percentage translate on it is a
 * percentage of the STAGE, not of the little image inside -- which is what lets
 * the layout live in plain CSS (`start`/`top`) while motion only ever moves a
 * delta. Scaling the wrapper scales about the stage centre, i.e. about the car,
 * so "tucked inside the vehicle" falls out of the geometry for free.
 */
function PartLayer({ part, progress }: { part: HeroPart; progress: MotionValue<number> }) {
  const [from, to] = CHAPTER_RANGE[part.chapter];
  // `transform: translate(T) scale(s)` about the stage centre O maps a point to
  // O + T + s*(p - O), so landing a part ON the car needs T = s*(O - p). The
  // scale factor was missing here, making T too large by 1/s and overshooting
  // every part to the OPPOSITE side of the car at 45% of its distance -- which
  // is why the "collapsed" first frame showed nine parts ringing the vehicle
  // instead of tucked inside it.
  const x = useTransform(
    progress,
    [from, to],
    [`${collapsed(HERO_CAR.startPct, part.startPct)}%`, "0%"],
  );
  const y = useTransform(
    progress,
    [from, to],
    [`${collapsed(HERO_CAR.topPct, part.topPct)}%`, "0%"],
  );
  const scale = useTransform(progress, [from, to], [COLLAPSED_SCALE, 1]);
  const opacity = useTransform(progress, [from, to], [COLLAPSED_OPACITY, 1]);

  return (
    <motion.div className="pointer-events-none absolute inset-0" style={{ x, y, scale, opacity }}>
      <PartImage part={part} />
    </motion.div>
  );
}

function PartImage({ part }: { part: HeroPart }) {
  return (
    <LandingImage
      src={`/landing/cutouts/${part.name}`}
      alt=""
      sizes={`${part.widthPct}vw`}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        insetInlineStart: `${part.startPct}%`,
        top: `${part.topPct}%`,
        width: `${part.widthPct}%`,
        height: "auto",
      }}
    />
  );
}

/**
 * The page's one orchestrated sequence (masterPlan §5 motion budget): the
 * vehicle's parts separate outward as the hero scrolls past. Transform and
 * opacity only, no layout properties, no new animation library -- `motion` was
 * already on this route and scroll-linked transforms add no bundle weight of
 * their own.
 *
 * Reduced motion returns the final state instantly and never subscribes to
 * scroll at all. `globals.css` carries a `prefers-reduced-motion` backstop for
 * the SSR paint that lands before this component hydrates, and a `<noscript>`
 * rule for the visitor whose JS never arrives -- without them the first frame
 * (progress 0, everything collapsed into the car) would be the *only* frame.
 */
export function HeroStage({ label, carAlt, hint }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Bound to the TRACK, not the stage. The stage is pinned, so its own box
  // stops moving and could never drive anything; the track is what scrolls.
  // ["start start", "end end"] makes the travel exactly the track's height minus
  // one viewport -- and since the track is `100vh + X`, that travel is exactly X
  // at every breakpoint instead of a number that shifts with window size.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  return (
    // The track only exists to buy scroll distance: `100vh` keeps the pinned
    // stage on screen for a full viewport, and the extra is the distance the
    // separation actually plays over. Reduced motion and no-JS collapse both
    // this and the pin back to nothing (globals.css) -- an empty screen-height
    // spacer would be pure dead scroll for a visitor who never sees the motion.
    <div
      ref={trackRef}
      className="hero-track relative min-h-[calc(100vh+14rem)] lg:min-h-[calc(100vh+34rem)]"
    >
      <div className="hero-pin sticky top-24 flex flex-col gap-6">
        <div
          role="group"
          aria-label={label}
          // The diagram is a physical object, not text. Left un-pinned, RTL flips
          // `insetInlineStart` to measure from the right while the collapse
          // translate below keeps computing a left-based delta, so every part moved
          // outward instead of into the car and four of the nine clipped off-stage.
          // `dir` (not a physical CSS property, so the logical-properties rule is
          // untouched) makes start mean left in both locales, and stops Tailwind's
          // `rtl:` variants applying to the layers inside.
          dir="ltr"
          className="hero-stage relative aspect-[16/11] w-full"
        >
          <LandingImage
            src="/landing/cutouts/car"
            alt={carAlt}
            sizes="(min-width: 1024px) 58vw, 90vw"
            priority
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              insetInlineStart: `${HERO_CAR.startPct}%`,
              top: `${HERO_CAR.topPct}%`,
              width: `${HERO_CAR.widthPct}%`,
              height: "auto",
            }}
          />
          {HERO_PARTS.map((part) =>
            reduceMotion ? (
              <div key={part.name} className="pointer-events-none absolute inset-0">
                <PartImage part={part} />
              </div>
            ) : (
              <PartLayer key={part.name} part={part} progress={scrollYProgress} />
            ),
          )}
        </div>
        <p className="font-mono text-caption text-graphite-400 motion-reduce:hidden">{hint}</p>
      </div>
    </div>
  );
}
