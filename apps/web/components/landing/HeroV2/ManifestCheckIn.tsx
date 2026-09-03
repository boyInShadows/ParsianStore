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
 * ## Highlight
 *
 * Row to sprite and sprite to row, one delegated listener each way. Both ends
 * carry the same `data-part` (the sprites get theirs in `HeroStage`), so this
 * pairs them by attribute rather than by knowing anything about either. Done
 * with two `setAttribute` calls rather than per-part CSS, because the pure-CSS
 * form needs one rule per part id and would hardcode the manifest into a
 * stylesheet.
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

    list.dataset.choreographed = "true";
    list.dataset.chapterReached = "0";
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
      // Both directions fall out of this: rows and sprites carry the same
      // attribute, so whichever end the pointer is on lights the other.
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

  return <div ref={wrapperRef}>{children}</div>;
}
