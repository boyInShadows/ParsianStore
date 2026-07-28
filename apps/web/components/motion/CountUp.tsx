"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { DURATION } from "@/lib/motion-tokens";

type Props = {
  value: number;
  className?: string;
};

// Counts up once when scrolled into view -- masterPlan.md §5 section 10
// ("Count-up on scroll, once, reduced-motion safe"). Deliberately does
// NOT use motion/react's `animate()`/`useInView()` (unlike this file's
// original P1.S7 version) -- those two APIs weren't used by anything
// else on the landing route (ExplodedView only uses variants/
// staggerChildren) and added ~2-3KB the first time this component
// actually shipped in production (P4.S5, Numbers.tsx), pushing the route
// over its 180KB budget. `useReducedMotion` stays -- it's already
// bundled via ExplodedView, so reusing it here is free. The native
// IntersectionObserver + requestAnimationFrame below cost nothing extra:
// they're browser APIs, not library code.
export function CountUp({ value, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-64px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    const durationMs = DURATION.slow * 1000;
    const startTime = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min((now - startTime) / durationMs, 1);
      // easeOut, matching the original animate() config's `ease: "easeOut"`.
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {(reduceMotion ? value : display).toLocaleString()}
    </span>
  );
}
