"use client"; // owns the hero's scroll progress, which useScroll can only measure on the client

import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";
import { useScroll, type MotionValue } from "motion/react";

/**
 * One scroll measurement, shared by everything in the hero that reacts to it.
 *
 * P9.S5 kept `useScroll` inside `HeroStage`, which was right while the stage was
 * the only thing that moved. P12.S4 adds the parts manifest, and the manifest
 * sits in the *copy* column while the stage sits in the diagram column -- two
 * different cells of the hero's grid, with no ancestor between them below the
 * section itself. Measuring the same track twice would mean two scroll
 * subscriptions reporting the same number, and the manifest would have no
 * legitimate way to reach the stage's ref anyway.
 *
 * So the provider owns the ref and the progress; the stage attaches the ref to
 * the track it renders, and every consumer reads one `MotionValue`.
 */
type HeroScroll = {
  /** Attach to the scroll track. The provider does not render it -- the stage does. */
  readonly trackRef: RefObject<HTMLDivElement | null>;
  /** 0 at the top of the track, 1 at the bottom. Drives every chapter. */
  readonly progress: MotionValue<number>;
};

const HeroScrollContext = createContext<HeroScroll | null>(null);

export function HeroScrollProvider({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Bound to the TRACK, not the stage. The stage is pinned, so its own box stops
  // moving and could never drive anything; the track is what scrolls.
  // ["start start", "end end"] makes the travel exactly the track's height minus
  // one viewport -- and since the track is `100vh + X`, that travel is exactly X
  // at every breakpoint instead of a number that shifts with window size.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  return (
    <HeroScrollContext.Provider value={{ trackRef, progress: scrollYProgress }}>
      {children}
    </HeroScrollContext.Provider>
  );
}

/**
 * Throws rather than returning null on purpose. A consumer rendered outside the
 * provider would otherwise silently never animate, which looks identical to
 * "the visitor has not scrolled yet" and is the kind of bug that ships.
 */
export function useHeroScroll(): HeroScroll {
  const value = useContext(HeroScrollContext);
  if (!value) {
    throw new Error("useHeroScroll must be used inside <HeroScrollProvider>.");
  }
  return value;
}
