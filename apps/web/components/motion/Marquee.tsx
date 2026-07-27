"use client";

import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  durationSeconds?: number;
};

// Continuous horizontal loop (brand wall, masterPlan.md §5 section 05).
// MUST pause on prefers-reduced-motion and on hover. Content is duplicated
// once so the loop is seamless; the duplicate is aria-hidden so screen
// readers don't announce it twice. `inert` (not just aria-hidden) is
// required whenever children can themselves be focusable (links, in
// BrandWall's case, P4.S4) -- aria-hidden alone hides content from
// assistive tech but does NOT stop keyboard Tab from reaching it, so a
// sighted keyboard user would tab into invisible duplicate links without
// `inert` (caught by axe's aria-hidden-focus rule).
export function Marquee({ children, className = "", durationSeconds = 30 }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`group overflow-hidden ${className}`}>
      <div
        className="motion-marquee-track flex w-max gap-8 group-hover:[animation-play-state:paused]"
        style={
          reduceMotion ? undefined : { animation: `marquee ${durationSeconds}s linear infinite` }
        }
      >
        {children}
        <div aria-hidden="true" inert className="flex w-max gap-8">
          {children}
        </div>
      </div>
    </div>
  );
}
