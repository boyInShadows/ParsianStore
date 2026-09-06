"use client"; // reads scroll progress, which does not exist on the server

import { useEffect, useRef } from "react";
import { useMotionValueEvent, useReducedMotion } from "motion/react";
import { CHAPTER_RANGE, CHAPTER_SEQUENCE, FINALE_BEAT, beatFor, coverOf } from "./heroLayout";

/**
 * The finale's own `data-callout` value.
 *
 * Deliberately not a part id: the finale block is shown by the same mechanism
 * as a plate, and giving it a name no part can have is what keeps "show the
 * caption for X" and "show the finale" one code path instead of two.
 */
const FINALE_ID = "__finale";
import { calloutSubjectByLayerId } from "./manifestData";
import { useHeroScroll } from "./HeroScrollProvider";

/**
 * Which callout is on screen, and nothing else (P13.S3).
 *
 * The plates are server-rendered by `PartCallout`; this decides which one is
 * showing. It is deliberately the same shape as `ManifestCheckIn`: one leaf,
 * one `useMotionValueEvent`, no React state, and it talks to the markup through
 * an attribute so scrolling re-renders nothing.
 *
 * ## Why a subject and not a slot
 *
 * A chapter plays one slot at a time -- that is the invariant P12.S6 built and
 * `e2e/landing-hero.spec.ts` asserts -- so at any scroll position there is at
 * most one part in the air, plus the chapter's cover if it has one. The hood is
 * a cover, so during chapter 2 the hood is up the whole time while the air
 * filter, piston and alternator take turns underneath it. Showing the hood's
 * plate for that entire stretch would leave one caption stuck on screen while
 * three others came and went beneath it, so **the slot wins over the cover**:
 * the cover is only named while nothing else is out.
 *
 * ## Cost
 *
 * `data-shown` changes at most twice per slot (on and off) across ten slots and
 * three covers, so under thirty attribute writes for the whole track -- inside
 * the ≤12-changes-per-value budget S13 sets, since each individual element is
 * touched twice. No layout is read, so nothing here can force a reflow.
 */
export function StageNarration() {
  const { progress } = useHeroScroll();
  const reduceMotion = useReducedMotion();
  const shown = useRef<string | null>(null);

  /**
   * The subject whose part is out at this scroll position, if any.
   *
   * Beats are read from `heroLayout` rather than restated, so a retuned
   * `BEAT_SPAN` moves the captions with the parts instead of desynchronising
   * them -- the failure would be a caption naming the part that just left.
   */
  const subjectAt = (value: number): string | null => {
    const byLayer = calloutSubjectByLayerId();

    // The finale outranks the chapter it overlaps. Chapter 3's last slot runs
    // to 0.980 and the finale opens at 0.860, so for most of the windshield's
    // beat both are live -- and once every part is in the air, naming one of
    // them is the wrong caption. The stage stops narrating and starts selling.
    if (value >= FINALE_BEAT[1] && value <= FINALE_BEAT[2]) return FINALE_ID;

    for (const chapter of [1, 2, 3] as const) {
      const [from, to] = CHAPTER_RANGE[chapter];
      if (value < from || value > to) continue;

      for (const [slot, ids] of CHAPTER_SEQUENCE[chapter].entries()) {
        const beat = beatFor(chapter, slot);
        if (value >= beat[0]! && value <= beat[3]!) {
          return byLayer.get(ids[0]!)?.id ?? null;
        }
      }

      // Inside the chapter but between slots: the cover, if this chapter has
      // one, is the only thing off the car.
      const cover = coverOf(chapter);
      return cover ? (byLayer.get(cover)?.id ?? null) : null;
    }
    return null;
  };

  const show = (id: string | null) => {
    if (shown.current === id) return;
    const root = document.getElementById("hero");
    if (!root) return;

    for (const element of root.querySelectorAll("[data-callout][data-shown]")) {
      element.removeAttribute("data-shown");
    }
    if (id) {
      for (const element of root.querySelectorAll(`[data-callout="${CSS.escape(id)}"]`)) {
        element.setAttribute("data-shown", "");
      }
    }
    shown.current = id;
  };

  useEffect(() => {
    // Reduced motion never separates the car (`HeroStage` renders the docked
    // composite), so there is nothing for a caption to point at. The plates are
    // not the accessible copy of this content -- the parts manifest is, and it
    // is *forced fully visible* for exactly these visitors, with the same
    // names, the same system codes and the same links in a list that can be
    // read rather than scrubbed. Eleven captions stacked on a stationary car
    // would be strictly worse than the list beside it.
    if (reduceMotion) show(null);
    return () => show(null);
  }, [reduceMotion]);

  useMotionValueEvent(progress, "change", (value) => {
    if (reduceMotion) return;
    show(subjectAt(value));
  });

  return null;
}
