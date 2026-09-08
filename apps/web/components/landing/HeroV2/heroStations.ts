import {
  CHAPTER_RANGE,
  CHAPTER_SEQUENCE,
  FINALE_BEAT,
  beatFor,
  type HeroLayer,
} from "./heroLayout";

/**
 * The four places the hero is *worth stopping at* (P14.S4).
 *
 * The nine slot peaks `StageSteps` walks are a finer grid than this: they are
 * one part each, and they are what "next station" means to a keyboard visitor
 * stepping through the manifest. These four are the chapters -- front, engine,
 * body, and the exploded finale -- and they are what a *scroll* should settle
 * on, because a scroll gesture is not a request for a specific part. It is a
 * request to move on, and the thing to land on is the middle of the next scene.
 *
 * ## Derived, not listed
 *
 * The plan gave these as literals (0.24 / 0.52 / 0.76 / 0.95). Three of the
 * four disagree with the layout the hero actually plays -- see
 * `heroStations.test.ts`, which re-derives them -- so they are computed here
 * from the same `CHAPTER_RANGE` / `beatFor` / `FINALE_BEAT` that drive the
 * sprites. A dwell point that is a literal is correct exactly once, and the
 * failure mode is silent: the scroll settles a hair off the beat, every part is
 * mid-flight, and the frame the visitor is asked to stop and read is a smear.
 *
 * The chapter dwell is the **centre of the middle slot's hold** -- the one
 * scroll position at which that chapter's central part is parked, stationary,
 * at its peak. Because the slots are laid out symmetrically inside the run
 * `beatFor` divides, that lands exactly on the chapter's own midpoint; the test
 * asserts both readings agree rather than assuming they always will.
 */
export type HeroStation = {
  /** Stable key: the chapter number, or the finale. */
  readonly id: "1" | "2" | "3" | "finale";
  /** The chapter this station is, where it is one. */
  readonly chapter: HeroLayer["chapter"] | null;
  /** Scroll progress, 0..1 of the hero's own track. */
  readonly p: number;
};

/**
 * How close the scroll has to stop to a dwell point before it is nudged onto
 * it.
 *
 * A band, not a magnet. Outside it nothing happens at all, which is the whole
 * safety property: a visitor who stopped halfway between two chapters meant to
 * stop there, and a page that pulled them somewhere else would be a page
 * fighting its own scrollbar. At the desktop track's 160rem of travel the band
 * is +-102px -- about one wheel tick either side of the beat.
 */
export const SNAP_TOLERANCE = 0.04;

/** The chapters, in order, plus the finale. */
export function heroStations(): readonly HeroStation[] {
  const chapters = ([1, 2, 3] as const).map((chapter): HeroStation => {
    const slots = CHAPTER_SEQUENCE[chapter].length;
    // The middle slot. For an odd count -- which every chapter has, and which
    // `heroStations.test.ts` pins -- this is the true centre.
    const beat = beatFor(chapter, Math.floor((slots - 1) / 2));
    return { id: String(chapter) as "1" | "2" | "3", chapter, p: (beat[1]! + beat[2]!) / 2 };
  });

  return [
    ...chapters,
    // The finale's own hold: `FINALE_BEAT` is [re-dock threshold, fully
    // exploded, end of track] and the mix is 1 from the second value onward, so
    // the centre of that stretch is a position where every part is parked and
    // nothing is moving.
    //
    // It moved from 0.93 to 0.95 at P14.S5, and only because the hold got
    // longer: the finale used to fall back to a docked car by p=1, so the hold
    // ran 0.90..0.96; the owner's Gate B reversal makes the exploded state the
    // resting state, so it now runs 0.90..1.00. Same rule, same expression, a
    // hold with a different far end.
    { id: "finale", chapter: null, p: (FINALE_BEAT[1] + FINALE_BEAT[2]) / 2 },
  ];
}

/**
 * The station a resting scroll position should settle onto, or `null`.
 *
 * Nearest wins, but only inside the band. The bands cannot overlap at the
 * current layout (the test asserts it), so "nearest" is a tie-break that should
 * never be needed -- it is here so that a future retune which brings two
 * chapters closer degrades to "snap to the nearer one" rather than to "snap to
 * whichever happens to be first in the array".
 */
export function stationNear(p: number): HeroStation | null {
  let best: HeroStation | null = null;
  let bestDistance = SNAP_TOLERANCE;
  for (const station of heroStations()) {
    const distance = Math.abs(station.p - p);
    if (distance <= bestDistance) {
      best = station;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Which station's scene is playing at this scroll position, for the caption's
 * live region.
 *
 * Deliberately the chapter's whole *range*, not the dwell band: the
 * announcement is "you are now in the engine bay", and that becomes true when
 * the first part of the chapter starts to move, not 15% of a track later when
 * the middle one reaches its peak. Between chapters it returns `null`, which
 * the caller reads as "say nothing" rather than as "say something else" -- a
 * live region that emptied itself in every gap would announce four times as
 * often for no added information.
 */
export function stationPlayingAt(p: number): HeroStation | null {
  const stations = heroStations();
  // The finale outranks the tail of chapter 3 it overlaps, exactly as it does
  // for the captions in `StageNarration`: once every part is in the air, the
  // scene is the catalogue rather than the windshield.
  //
  // And it outranks it all the way to the end of the track now, because
  // `FINALE_BEAT[2]` is 1.0 since the Gate B reversal. Under the old four-value
  // beat this window closed at 0.96 and chapter 3's range ran to 0.98, so the
  // last 2% of the scroll announced "station 3" again over a stage that was
  // finishing its finale -- a caption for the scene the visitor had just left.
  if (p >= FINALE_BEAT[1] && p <= FINALE_BEAT[2]) {
    return stations.find((station) => station.id === "finale") ?? null;
  }
  for (const station of stations) {
    if (!station.chapter) continue;
    const [from, to] = CHAPTER_RANGE[station.chapter];
    if (p >= from && p <= to) return station;
  }
  return null;
}

/**
 * The document scroll position that puts the hero at `p`.
 *
 * Document coordinates, from the track's own box, because every caller is about
 * to hand the number to `window.scrollTo`. `getBoundingClientRect().top` is
 * viewport-relative and therefore already stale the moment anything has
 * scrolled -- the same trap `e2e/landing-hero.spec.ts` documents at
 * `scrollHeroTo`.
 */
export function stationScrollTop(track: HTMLElement, p: number): number {
  const box = track.getBoundingClientRect();
  const top = box.top + window.scrollY;
  // `["start start", "end end"]`: the travel is the track's height less one
  // viewport, which is exactly the `+96rem` / `+160rem` the track adds.
  const travel = box.height - window.innerHeight;
  return top + travel * p;
}
