"use client"; // moves the scroll position, which only exists in the browser

import { useReducedMotion } from "motion/react";
import { CHAPTER_RANGE, CHAPTER_SEQUENCE, beatFor } from "./heroLayout";
import { useHeroScroll } from "./HeroScrollProvider";

/**
 * Station-to-station controls for a hero that is otherwise scroll-only
 * (fableTasks v1.1 P13.S11).
 *
 * A scroll-linked animation has a real accessibility gap that axe cannot see: a
 * keyboard user has no way to *scrub* it. Tab moves focus between links, and
 * the arrow keys scroll by a line -- so reaching the beat where the alternator
 * is named means holding a key and watching for it. These two buttons move the
 * page to the next and previous slot peaks, which is the same thing a scroll
 * gesture does, in one keystroke.
 *
 * ## Why it moves the page and not a value
 *
 * Everything in this hero reads one number: the scroll progress of
 * `.hero-track`. Setting that number directly would desynchronise the page from
 * the thing that produces it, so the buttons scroll the window instead and the
 * whole scene follows exactly as it does for a pointer user. There is one
 * source of truth for where the hero is, and it stays the scrollbar.
 *
 * `behavior: smooth` is skipped under reduced motion -- and under reduced
 * motion the hero does not animate at all, so the buttons are not rendered
 * either: there would be no stations to move between.
 */
export function StageSteps({ next, previous }: { next: string; previous: string }) {
  const { trackRef, progress } = useHeroScroll();
  const reduceMotion = useReducedMotion();

  /**
   * The scroll position of every slot's hold, in order.
   *
   * Derived from `heroLayout` rather than listed, like every other consumer of
   * the beats -- a retuned `BEAT_SPAN` moves these with the parts instead of
   * leaving the buttons pointing between them.
   */
  const stops = ([1, 2, 3] as const).flatMap((chapter) =>
    CHAPTER_SEQUENCE[chapter].map((_, slot) => {
      const beat = beatFor(chapter, slot);
      return (beat[1]! + beat[2]!) / 2;
    }),
  );

  const go = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const here = progress.get();
    // A hair of tolerance so pressing "next" while sitting exactly on a stop
    // moves to the following one rather than to the stop you are already at.
    const target =
      direction === 1
        ? stops.find((stop) => stop > here + 0.005)
        : [...stops].reverse().find((stop) => stop < here - 0.005);

    const box = track.getBoundingClientRect();
    const top = box.top + window.scrollY;
    const travel = box.height - window.innerHeight;
    // Past the last stop, "next" leaves the hero rather than refusing: the
    // finale and the page below it are where the visitor is going anyway.
    const fraction = target ?? (direction === 1 ? 1 : CHAPTER_RANGE[1][0]);

    window.scrollTo({ top: top + travel * fraction, behavior: "smooth" });
  };

  if (reduceMotion) return null;

  return (
    <div className="flex items-center gap-2 motion-reduce:hidden">
      <button
        type="button"
        onClick={() => go(-1)}
        className="inline-flex min-h-12 items-center border border-border px-4 font-mono text-caption text-text-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        {previous}
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="inline-flex min-h-12 items-center border border-border px-4 font-mono text-caption text-text-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        {next}
      </button>
    </div>
  );
}
