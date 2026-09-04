"use client"; // reads scroll progress and pointer state, neither of which exists on the server

import { useEffect, useRef, type ReactNode } from "react";
import { useMotionValueEvent, useReducedMotion } from "motion/react";
import { CHAPTER_RANGE } from "./heroLayout";
import { useHeroScroll } from "./HeroScrollProvider";

/**
 * The manifest's two client-side behaviours, kept to one leaf.
 *
 * Both are enhancements over markup that is already complete and already
 * correct on the server, and both talk to that markup through data attributes
 * instead of owning it. That is what keeps nine rows of image, text and link
 * out of the route's JavaScript on a page already over its budget.
 *
 * ## Check-in
 *
 * A row appears as its part undocks (§2.1), and rows accumulate rather than
 * clear. The whole mechanism is one attribute: `data-chapter-reached` on the
 * `<ol>`, written from scroll progress, with the transitions in `globals.css`.
 * No React state, so scrolling re-renders nothing.
 *
 * **It only ever hides rows that it can bring back.** The server renders
 * `data-chapter-reached="3"` -- everything present -- and this component opts
 * into the choreography by setting `data-choreographed` on mount. Without
 * JavaScript, or under reduced motion, that never happens and the full list
 * simply stands, which is what §2.3 requires. Writing it the other way round
 * would mean a no-JS visitor gets an empty panel.
 *
 * The row/sprite highlight is NOT here -- it lives in `HeroScrollProvider`,
 * which mounts once. P12.S5 renders the manifest twice (the desktop panel and
 * the mobile chip rail, one hidden by CSS at any width), and a listener owned
 * by this component would then be attached to the hero twice over.
 */
export function ManifestCheckIn({ children }: { children: ReactNode }) {
  const { progress } = useHeroScroll();
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const listOf = (node: HTMLElement | null) =>
    node?.querySelector<HTMLElement>("[data-chapter-reached]") ?? null;

  useEffect(() => {
    const list = listOf(wrapperRef.current);
    if (!list) return;

    if (reduceMotion) {
      // Explicitly put back, in case a visitor turned the preference on after
      // a previous render had already opted in.
      delete list.dataset.choreographed;
      list.dataset.chapterReached = "3";
      return;
    }

    // Usually a no-op: `PRE_PAINT` in PartsManifest already set both, before
    // the browser painted. This is the same assignment, for the case where that
    // script did not run, and for a visitor who turns reduced motion back off.
    list.dataset.choreographed = "true";
    if (list.dataset.chapterReached === "3") list.dataset.chapterReached = "0";
    return () => {
      delete list.dataset.choreographed;
      list.dataset.chapterReached = "3";
    };
  }, [reduceMotion]);

  useMotionValueEvent(progress, "change", (value) => {
    const list = listOf(wrapperRef.current);
    if (!list || reduceMotion) return;

    // A chapter has "checked in" once its parts have begun to leave the car --
    // the start of its range, not its peak. Waiting for the peak would put the
    // row on screen after the part had already turned around.
    let reached = 0;
    for (const chapter of [1, 2, 3] as const) {
      if (value >= CHAPTER_RANGE[chapter][0]) reached = chapter;
    }

    const next = String(reached);
    if (list.dataset.chapterReached !== next) list.dataset.chapterReached = next;
  });

  return <div ref={wrapperRef}>{children}</div>;
}
