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
};

/**
 * One part layer. The wrapper is inset-0, so a percentage translate on it is a
 * percentage of the STAGE, not of the little image inside -- which is what lets
 * the layout live in plain CSS (`start`/`top`) while motion only ever moves a
 * delta. Scaling the wrapper scales about the stage centre, i.e. about the car,
 * so "tucked inside the vehicle" falls out of the geometry for free.
 */
function PartLayer({ part, progress }: { part: HeroPart; progress: MotionValue<number> }) {
  const [from, to] = CHAPTER_RANGE[part.chapter];
  const x = useTransform(progress, [from, to], [`${HERO_CAR.startPct - part.startPct}%`, "0%"]);
  const y = useTransform(progress, [from, to], [`${HERO_CAR.topPct - part.topPct}%`, "0%"]);
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
      className="absolute -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
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
export function HeroStage({ label, carAlt }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end start"],
  });

  return (
    <div
      ref={stageRef}
      role="group"
      aria-label={label}
      className="hero-stage relative aspect-[16/11] w-full"
    >
      <LandingImage
        src="/landing/cutouts/car"
        alt={carAlt}
        sizes="(min-width: 1024px) 58vw, 90vw"
        priority
        className="absolute -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
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
  );
}
