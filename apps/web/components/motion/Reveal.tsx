"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT, REVEAL_TRAVEL_PX } from "@/lib/motion-tokens";

type Props = {
  children: ReactNode;
  className?: string;
};

// Scroll-reveal: fade + <=24px travel, <=400ms -- masterPlan.md §5 motion
// budget. Reduced motion = instant final state, not "a bit less motion".
export function Reveal({ children, className }: Props) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: REVEAL_TRAVEL_PX }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
