"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT, REVEAL_TRAVEL_PX } from "@/lib/motion-tokens";

type RootProps = {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
};

function StaggerRoot({ children, className, staggerDelay = 0.08 }: RootProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-64px" }}
      variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
    >
      {children}
    </motion.div>
  );
}

function Item({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: REVEAL_TRAVEL_PX },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

export const Stagger = Object.assign(StaggerRoot, { Item });
