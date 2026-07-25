"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { DURATION } from "@/lib/motion-tokens";

type Props = {
  value: number;
  className?: string;
};

// Counts up once when scrolled into view -- masterPlan.md §5 section 10
// ("Count-up on scroll, once, reduced-motion safe").
export function CountUp({ value, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-64px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Reduced motion renders `value` directly below -- nothing to
    // synchronize, so the effect does nothing rather than setting state
    // once itself (which would trip react-hooks/set-state-in-effect the
    // same way the theme-toggle "mounted" pattern did in P1.S5).
    if (!inView || reduceMotion) return;

    const controls = animate(0, value, {
      duration: DURATION.slow,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {(reduceMotion ? value : display).toLocaleString()}
    </span>
  );
}
