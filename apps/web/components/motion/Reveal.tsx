"use client";

// 'use client': an IntersectionObserver is the only way to know a section has
// arrived, and the server cannot know where the viewport is. Deliberately a
// LEAF -- `children` arrive already rendered by the server and are passed
// straight through, so wrapping a grid in <Reveal> costs one small client
// component, not a client-side copy of the grid's markup.

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { REVEAL_ARMED_ATTR, REVEAL_ARMED_LIVE } from "./RevealBoot";

/**
 * Enter-on-view reveal for everything below the hero (fableTasks §P14.S7).
 *
 * ## Why this is CSS and not motion's `whileInView`
 *
 * `/` is at 197KB First Load JS against a 193KB gate and 306ms TBT against
 * 200ms, and the attribution pass found 692 of ~936ms across the long tasks is
 * **Style & Layout recalculation, not script execution**. `motion` is already
 * in this route's chunk (the hero pulls it), so a `whileInView` wrapper would
 * have cost ~0 KB of bundle -- but the landing has roughly forty things worth
 * revealing, and forty more VisualElements to construct and measure during
 * hydration is precisely the cost that number is made of. One shared
 * observer, one attribute write, no React re-render, and no layout read on
 * scroll is strictly cheaper on the metric that is actually failing.
 *
 * The visible behaviour is what §P14.S7 asks for: opacity 0 -> 1 with 16px of
 * upward travel, ease-out, once, at 20% visibility with a 10% bottom margin.
 * No scale, no blur, no bounce.
 *
 * The hidden state, the travel, the duration, the 60ms stagger and the
 * reduced-motion override all live in `styles/globals.css` next to the tokens
 * they read. Reduced motion is handled there rather than here on purpose: a
 * `useReducedMotion()` branch cannot run during SSR, so it would paint the
 * hidden state first and correct it at hydration. The media query is true at
 * first paint.
 *
 * ## This component cannot hide anything on its own
 *
 * `data-reveal` is inert until `RevealBoot`'s blocking inline script puts
 * `data-reveal-armed` on `<html>`; every hiding rule in `globals.css` is behind
 * it. So the server-rendered page is visible, and the only way to reach the
 * hidden pre-reveal state is for JavaScript to have run. See `RevealBoot.tsx`
 * for why -- short version: an observer that only exists after successful
 * hydration must never be the sole thing standing between the visitor and the
 * content.
 *
 * The one obligation that leaves here: tell the watchdog the observer is real.
 */
type Props = {
  children: ReactNode;
  className?: string;
  /**
   * Reveal the wrapper's direct children 60ms apart instead of the wrapper
   * itself -- for a grid of cards, a rail of rows, a list of chips. The
   * wrapper does not fade in this mode; two nested fades multiply their
   * opacities and the result reads as a slower, muddier single fade.
   */
  stagger?: boolean;
  /**
   * The element to render. A staggered list has to stay a list: replacing a
   * `<ul>` with a `<div>` to get a reveal would trade a real a11y structure
   * for an animation.
   */
  as?: "div" | "ul" | "ol" | "aside";
  /**
   * Passed through because a reveal wrapper often *is* the labelled element:
   * `FindMyPart`'s system index is a `<ul aria-labelledby=...>` and would lose
   * its accessible name if wrapping it in a reveal quietly dropped the
   * attribute.
   */
  "aria-labelledby"?: string;
};

// Matches fableTasks §P14.S7: `amount: 0.2`, `margin: '0px 0px -10% 0px'`.
const REVEAL_RATIO = 0.2;
const OBSERVER_OPTIONS: IntersectionObserverInit = {
  // Two thresholds, not one. A section taller than the viewport can never
  // reach an intersectionRatio of 0.2 -- at 5x the viewport height the ratio
  // tops out at 0.2 and at 6x it never gets there at all, so a `threshold:
  // 0.2` alone would leave the tallest section on the page permanently at
  // opacity 0. The 0 threshold gives the callback a chance to apply the
  // second, viewport-relative test below.
  threshold: [0, REVEAL_RATIO],
  rootMargin: "0px 0px -10% 0px",
};

let observer: IntersectionObserver | null = null;

/**
 * One observer for the whole page rather than one per wrapper: every Reveal
 * uses identical options, and forty observers is forty sets of callbacks the
 * browser has to service on the same scroll.
 */
function getObserver(): IntersectionObserver {
  if (observer) return observer;

  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      // Either a fifth of the element is on screen, or the element is filling
      // a fifth of the viewport -- the second clause is what covers an element
      // too tall for the first to ever be true of.
      const viewportHeight = entry.rootBounds?.height ?? window.innerHeight;
      const fillsViewport = entry.intersectionRect.height >= viewportHeight * REVEAL_RATIO;
      if (entry.intersectionRatio < REVEAL_RATIO && !fillsViewport) continue;

      entry.target.setAttribute("data-reveal", "in");
      // `once: true`. Nothing on this page re-hides.
      observer?.unobserve(entry.target);
    }
  }, OBSERVER_OPTIONS);

  return observer;
}

export function Reveal({
  children,
  className,
  stagger = false,
  as: Tag = "div",
  "aria-labelledby": ariaLabelledBy,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No IntersectionObserver (an old browser, or a test runner) must mean the
    // content is visible, never that it is stuck hidden.
    if (typeof IntersectionObserver === "undefined") {
      element.setAttribute("data-reveal", "in");
      return;
    }

    const active = getObserver();
    active.observe(element);

    // Call off `RevealBoot`'s watchdog: something is now genuinely watching
    // this element, so the hidden state has a way back.
    //
    // `hasAttribute` first, and never `setAttribute` unconditionally. If the
    // watchdog already fired -- hydration was slower than the deadline -- the
    // sections are on screen and re-arming would yank them back out from under
    // the visitor. Disarming is one-way on purpose.
    const root = document.documentElement;
    if (root.hasAttribute(REVEAL_ARMED_ATTR)) {
      root.setAttribute(REVEAL_ARMED_ATTR, REVEAL_ARMED_LIVE);
    }

    return () => active.unobserve(element);
  }, []);

  return (
    <Tag
      // The cast is the price of a polymorphic tag with one ref: TSX resolves
      // `Tag` to a union of three element types and no single RefObject
      // satisfies all three, though every member of the union is an
      // HTMLElement.
      ref={ref as React.RefObject<never>}
      className={className}
      aria-labelledby={ariaLabelledBy}
      data-reveal=""
      {...(stagger ? { "data-reveal-stagger": "" } : {})}
    >
      {children}
    </Tag>
  );
}
