"use client"; // owns the hero's scroll progress, which useScroll can only measure on the client

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useReducedMotion, useScroll, useSpring, type MotionValue } from "motion/react";
import { stationNear, stationScrollTop } from "./heroStations";

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
  /**
   * **The smoothed value. Drive every transform from this one** (P14.S4).
   *
   * 0 at the top of the track, 1 at the bottom, following the scrollbar through
   * a spring rather than tracking it frame for frame. Under reduced motion it
   * *is* the raw value -- see `SPRING` below.
   */
  readonly progress: MotionValue<number>;
  /**
   * The raw scroll position, for code that computes a scroll *target* rather
   * than a picture.
   *
   * The distinction is not cosmetic. `progress` is where the drawing is;
   * `scrollProgress` is where the page is. A "next station" button that read
   * the spring during a flick would find the stop after where the car appears
   * to be -- which can be *behind* the scrollbar -- and would scroll the
   * visitor backwards to get there.
   */
  readonly scrollProgress: MotionValue<number>;
  /**
   * Turn soft snapping off for `ms` while a scripted scroll runs; `0` re-arms
   * it immediately.
   *
   * Every scripted scroll in the hero (the station buttons, the tour) lands on
   * a position it chose. Snapping is a reaction to the scroll *stopping*, and
   * it cannot tell a visitor's flick from a `scrollTo` that is still animating
   * -- so without this the tour would be dragged onto a chapter midpoint in the
   * middle of a leg, by the one mechanism that is meant never to fight a
   * deliberate move.
   */
  readonly holdSnap: (ms: number) => void;
};

const HeroScrollContext = createContext<HeroScroll | null>(null);

/**
 * The smoothing (P14.S4). Overdamped, deliberately, and retuned from the
 * plan's `{60, 20, 0.6}`.
 *
 * The owner asked for two things that pull apart: a slow scroll that feels 1:1,
 * and a fast flick that *plays* the story instead of teleporting past it. A
 * spring gives both, and the constants decide which one it favours:
 *
 * - **`damping` is 11, not 20.** At 20 the damping ratio is 1.67 -- so heavily
 *   overdamped that a full-track flick took **2.3 seconds** to come to rest,
 *   and every one of those seconds is a frame of work recomputing forty
 *   transforms on a route that is already over its TBT budget. 11 puts the
 *   ratio at 1.06: still above 1, so it **never overshoots** (an overshoot here
 *   would run the story backwards past the beat it just reached), while a
 *   full-track flick settles in 1.35s and is 95% arrived at 0.60s -- the "plays
 *   through in about a second" the plan asked for, at 58% of the frame cost.
 * - **`stiffness` 45 with `mass` 0.6** sets the steady-state lag of a slow
 *   scroll at `damping / stiffness` = 0.24s, against 0.33s at the plan's
 *   numbers. Lag during a *steady* scroll is invisible -- what is felt is the
 *   ease-out when the gesture stops -- so the tighter number is free.
 * - **`restDelta` is the one that would have shipped a bug.** Motion's default
 *   for a value on this scale is 0.005, and 0.005 of a 160rem track is 12.8px
 *   of scroll: the spring would declare itself finished and jump the last
 *   twelve pixels of the story. That is the *exact* symptom §3.7 of the brief
 *   records from the last transform-graph bug ("the car finished ~10px of
 *   scroll short of docked"), and it would have been read as a regression of
 *   it. 0.0005 puts the jump at 1.3px, below one frame of a slow scroll.
 */
const SPRING = { stiffness: 45, damping: 11, mass: 0.6, restDelta: 0.0005 } as const;

/** How long the scroll must be still before snapping is considered. */
const IDLE_MS = 150;

/** How close the spring must be to the scrollbar before its value is trusted. */
const SETTLED = 0.0002;

export function HeroScrollProvider({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Bound to the TRACK, not the stage. The stage is pinned, so its own box stops
  // moving and could never drive anything; the track is what scrolls.
  // ["start start", "end end"] makes the travel exactly the track's height minus
  // one viewport -- and since the track is `100vh + X`, that travel is exactly X
  // at every breakpoint instead of a number that shifts with window size.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const smoothed = useSpring(scrollYProgress, SPRING);
  // Reduced motion gets the scrollbar itself, with no spring between. A visitor
  // who asked for less movement has not asked for the page to keep moving after
  // they stopped -- which is precisely what smoothing is. The spring is still
  // *constructed* (hooks cannot be conditional) but nothing subscribes to it:
  // `HeroStage` renders the docked composite, `StageNarration` returns early,
  // and the snapping below never arms.
  const progress = reduceMotion ? scrollYProgress : smoothed;

  const snapHeldUntil = useRef(0);
  const holdSnap = useCallback((ms: number) => {
    // Extends an existing hold rather than replacing it, so two scripted
    // scrolls cannot shorten each other -- except at 0, which is the explicit
    // "the scripted scroll is over, take it back" a cancelled tour needs.
    snapHeldUntil.current = ms > 0 ? Math.max(snapHeldUntil.current, Date.now() + ms) : 0;
  }, []);

  // The row/sprite highlight. It lives here, not in the manifest, because the
  // manifest renders twice -- the desktop panel and the mobile chip rail, one
  // of them CSS-hidden at any width -- while this provider mounts once.
  //
  // Both ends carry the same `data-part` (sprites get theirs in HeroStage), so
  // one delegated listener pairs them by attribute and both directions fall out
  // of it: whichever end the pointer or focus is on lights the other.
  useEffect(() => {
    const root = document.getElementById("hero");
    if (!root) return;

    let highlighted: Element[] = [];
    const clear = () => {
      for (const element of highlighted) element.removeAttribute("data-highlight");
      highlighted = [];
    };
    const highlight = (event: Event) => {
      const target = event.target;
      const owner = target instanceof Element ? target.closest<HTMLElement>("[data-part]") : null;
      const id = owner?.dataset.part;
      clear();
      if (!id) return;
      highlighted = [...root.querySelectorAll(`[data-part="${CSS.escape(id)}"]`)];
      for (const element of highlighted) element.setAttribute("data-highlight", "");
    };

    root.addEventListener("pointerover", highlight);
    root.addEventListener("pointerleave", clear);
    root.addEventListener("focusin", highlight);
    root.addEventListener("focusout", clear);
    return () => {
      root.removeEventListener("pointerover", highlight);
      root.removeEventListener("pointerleave", clear);
      root.removeEventListener("focusin", highlight);
      root.removeEventListener("focusout", clear);
      clear();
    };
  }, []);

  /**
   * Soft station snapping (P14.S4).
   *
   * The rule, and every clause of it is a way of *not* hijacking the scroll:
   * it runs only after a **gesture**, only when that gesture has **stopped**,
   * only when the resting position is already within `SNAP_TOLERANCE` of a
   * dwell point, and never while the visitor is dragging the scrollbar or a
   * scripted scroll is running. Outside the band it does nothing at all -- a
   * visitor who stopped between two chapters meant to be between two chapters.
   *
   * **A `scroll` event is not enough to arm it**, and that clause does more
   * work than it looks. `scroll` fires for things the visitor did not do:
   * the browser restoring a position on reload, a `#hash` jump, a "skip to
   * content" link, the station buttons, the tour, an automated test. Snapping
   * after any of those would move the page away from somewhere it had just
   * been asked to go. So an actual input -- a wheel, a touch drag, or one of
   * the keys that scroll -- has to have happened, and it arms exactly one
   * evaluation.
   *
   * It reads the **spring**, not the scrollbar, because the band is a statement
   * about the picture: "the scene is nearly parked, park it". The spring is
   * still catching up 150ms after the gesture ends, so the idle timer re-arms
   * until it has arrived rather than testing a value in flight -- which would
   * mis-read the band by however far the spring still had to travel.
   */
  useEffect(() => {
    if (reduceMotion) return;

    let idle: ReturnType<typeof setTimeout> | undefined;
    let draggingScrollbar = false;
    let gestured = false;

    const settle = () => {
      idle = undefined;
      const track = trackRef.current;
      if (!track || !gestured || draggingScrollbar || Date.now() < snapHeldUntil.current) return;

      // Still moving: the value the band would be tested against has not
      // arrived yet. Wait for it rather than guess with it -- and stay armed,
      // because the gesture has not been spent until it has been judged.
      if (Math.abs(progress.get() - scrollYProgress.get()) > SETTLED) {
        idle = setTimeout(settle, IDLE_MS);
        return;
      }

      // One gesture, one decision. Re-armed by the next real input.
      gestured = false;

      const station = stationNear(progress.get());
      if (!station) return;

      const top = stationScrollTop(track, station.p);
      // Already there. Re-issuing the scroll would fire more scroll events,
      // re-arm this timer and snap again -- a loop that never converges
      // because `scrollTo` rounds to a device pixel.
      if (Math.abs(top - window.scrollY) < 2) return;

      // The scripted scroll must not be read as the visitor stopping somewhere
      // new, and a smooth scroll of at most one band is quick.
      holdSnap(800);
      window.scrollTo({ top, behavior: "smooth" });
    };

    const onScroll = () => {
      if (idle) clearTimeout(idle);
      idle = setTimeout(settle, IDLE_MS);
    };

    /** The keys that scroll. Anything else is typing, and typing is not a gesture. */
    const SCROLL_KEYS = new Set([
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
      "Spacebar",
    ]);

    const onGesture = () => {
      gestured = true;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) gestured = true;
    };

    /**
     * A pointer in the scrollbar gutter, on either side.
     *
     * `document.documentElement.clientWidth` excludes the classic scrollbar, so
     * the gutter is whatever `innerWidth` has that the client box does not.
     * Which *side* it is on is a browser decision the page does not get to
     * make -- Chrome puts it at the start edge for an RTL document -- so both
     * ends are checked. Nothing else is rendered in that strip, so a pointer
     * there is a scrollbar interaction by elimination.
     */
    const inScrollbarGutter = (x: number) => {
      const gutter = window.innerWidth - document.documentElement.clientWidth;
      if (gutter <= 0) return false;
      return x >= document.documentElement.clientWidth || x < gutter;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!inScrollbarGutter(event.clientX)) return;
      draggingScrollbar = true;
      if (idle) clearTimeout(idle);
      idle = undefined;
    };
    const onPointerUp = () => {
      draggingScrollbar = false;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onGesture, { passive: true });
    window.addEventListener("touchmove", onGesture, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    return () => {
      if (idle) clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onGesture);
      window.removeEventListener("touchmove", onGesture);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
    // `progress` and `scrollYProgress` are motion values, stable for the hero's
    // lifetime, and `holdSnap` is a stable callback; listing them would only
    // make this effect look conditional on things that never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <HeroScrollContext.Provider
      value={{ trackRef, progress, scrollProgress: scrollYProgress, holdSnap }}
    >
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
