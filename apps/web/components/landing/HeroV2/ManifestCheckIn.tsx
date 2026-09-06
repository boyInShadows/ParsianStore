"use client"; // reads scroll progress and pointer state, neither of which exists on the server

import { useEffect, useRef, type ReactNode } from "react";
import { useMotionValueEvent, useReducedMotion } from "motion/react";
import { useHeroScroll } from "./HeroScrollProvider";

/**
 * The job card's live behaviour, kept to one leaf.
 *
 * It is an enhancement over markup that is already complete and already correct
 * on the server, and it talks to that markup through data attributes instead of
 * owning it. That is what keeps nine rows of image, text and link out of the
 * route's JavaScript on a page already over its budget.
 *
 * ## Check-in, per part rather than per chapter (P13.S4)
 *
 * A row appears as its own part undocks, and rows accumulate. Until P13.S4 the
 * unit was the *chapter*: one attribute, `data-chapter-reached`, and all three
 * of chapter 1's rows arrived the moment the headlights began to move. The list
 * claimed three parts had come off while the visitor could see one -- the same
 * "it reads as one event with three shapes in it" defect P12.S6 fixed in the
 * diagram, still present in the list beside it.
 *
 * Each row now carries its own `data-check-in`, written by the server from
 * `beatOf`, and this compares it against scroll progress. Still no React state,
 * so scrolling re-renders nothing; the transitions live in `globals.css`.
 *
 * **It only ever hides rows that it can bring back.** The server renders every
 * row checked in, and this component opts into the choreography by setting
 * `data-choreographed`. Without JavaScript, or under reduced motion, that never
 * happens and the full list simply stands, which is what §2.3 requires. Writing
 * it the other way round would mean a no-JS visitor gets an empty panel.
 *
 * The row/sprite highlight is NOT here -- it lives in `HeroScrollProvider`,
 * which mounts once. The manifest renders twice (the desktop panel and the
 * mobile chip rail, one hidden by CSS at any width), and a listener owned by
 * this component would be attached to the hero twice over.
 */
export function ManifestCheckIn({ children }: { children: ReactNode }) {
  const { progress } = useHeroScroll();
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const checkedIn = useRef(-1);

  const listOf = (node: HTMLElement | null) =>
    node?.querySelector<HTMLElement>("[data-chapter-reached]") ?? null;

  /**
   * Mark the pre-rendered counter value that is true, and take the mark off the
   * rest. `null` hands the counter back to its no-JS default -- the complete
   * count -- which is the state the list is in whenever the choreography is off.
   */
  const showCount = (count: number | null) => {
    const counter = wrapperRef.current
      ?.closest("nav")
      ?.querySelector<HTMLElement>(".manifest-counter");
    if (!counter) return;
    for (const span of counter.querySelectorAll<HTMLElement>("[data-shown-count]")) {
      delete span.dataset.shownCount;
    }
    if (count === null) {
      delete counter.dataset.live;
      return;
    }
    counter.dataset.live = "true";
    const match = counter.querySelector<HTMLElement>(`[data-count="${count}"]`);
    if (match) match.dataset.shownCount = "";
  };

  const rowsOf = (list: HTMLElement) =>
    [...list.querySelectorAll<HTMLElement>("[data-check-in]")].sort(
      (a, b) => Number(a.dataset.checkIn) - Number(b.dataset.checkIn),
    );

  /**
   * Bring the list and the counter into line with a scroll position.
   *
   * Shared by the mount effect and the scroll listener, because "what the list
   * looks like at progress p" has exactly one answer and mount is just p=0 --
   * or wherever the browser restored the page to. Written only in the listener,
   * the counter sat at its no-JS default of "۹ از ۹" above a list with nothing
   * checked in until the visitor's first scroll, and a reload halfway down the
   * page showed an empty job card beside a half-dismantled car.
   */
  const apply = (list: HTMLElement, value: number) => {
    const rows = rowsOf(list);
    // Rows are sorted by check-in, so the count is just how many are behind the
    // playhead -- and scrolling back up un-checks them by the same arithmetic.
    let count = 0;
    while (count < rows.length && Number(rows[count]!.dataset.checkIn) <= value) count += 1;
    if (count === checkedIn.current) return null;

    for (const [index, row] of rows.entries()) {
      if (index < count) row.dataset.checked = "";
      else delete row.dataset.checked;
    }
    showCount(count);
    checkedIn.current = count;
    return rows[count - 1] ?? null;
  };

  useEffect(() => {
    const list = listOf(wrapperRef.current);
    if (!list) return;

    const restore = () => {
      delete list.dataset.choreographed;
      list.dataset.chapterReached = "3";
      for (const row of rowsOf(list)) row.dataset.checked = "";
      showCount(null);
      checkedIn.current = -1;
    };

    if (reduceMotion) {
      // Explicitly put back, in case a visitor turned the preference on after a
      // previous render had already opted in.
      restore();
      return;
    }

    // Usually a no-op: `PRE_PAINT` in PartsManifest already set both, before the
    // browser painted. This is the same assignment, for the case where that
    // script did not run, and for a visitor who turns reduced motion back off.
    list.dataset.choreographed = "true";
    if (list.dataset.chapterReached === "3") list.dataset.chapterReached = "0";
    // Not zero: the browser may have restored a scroll position, and the list
    // has to describe the car that is actually on screen.
    apply(list, progress.get());
    return restore;
    // `apply` closes over refs and the DOM only, so it is stable in every way
    // that matters here; listing it would re-run the whole opt-in on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, progress]);

  useMotionValueEvent(progress, "change", (value) => {
    const list = listOf(wrapperRef.current);
    if (!list || reduceMotion) return;

    const active = apply(list, value);

    // The mobile rail is a horizontal scroller: a chip that checks in off the
    // end of it is a row the visitor never sees arrive, which is the whole
    // point of the beat. `apply` returns null when nothing changed, so this
    // runs at most nine times across the track.
    if (active?.classList.contains("manifest-chip")) {
      active.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  });

  return <div ref={wrapperRef}>{children}</div>;
}
