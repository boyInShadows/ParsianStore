"use client"; // moves the scroll position, which only exists in the browser

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { CHAPTER_RANGE, CHAPTER_SEQUENCE, beatFor } from "./heroLayout";
import { heroStations, stationScrollTop } from "./heroStations";
import { useHeroScroll } from "./HeroScrollProvider";

/**
 * Station-to-station controls for a hero that is otherwise scroll-only
 * (fableTasks v1.1 P13.S11, extended by P14.S4).
 *
 * A scroll-linked animation has a real accessibility gap that axe cannot see: a
 * keyboard user has no way to *scrub* it. Tab moves focus between links, and
 * the arrow keys scroll by a line -- so reaching the beat where the alternator
 * is named means holding a key and watching for it. These buttons move the
 * page to the next and previous slot peaks, which is the same thing a scroll
 * gesture does, in one keystroke.
 *
 * The third button plays the whole thing: see `Tour mode` below.
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

/** One leg of the tour: how long the scroll takes to cross to the next station. */
const TOUR_LEG_MS = 2400;

/** How long it holds still on arrival, so the parked frame can be read. */
const TOUR_HOLD_MS = 800;

/**
 * `easeInOut` as the plan asks, written out rather than imported.
 *
 * A cubic in/out: it leaves and arrives at zero speed, which is what makes a
 * scripted scroll read as a camera move rather than as a jump-cut. No library
 * -- the whole tour is `requestAnimationFrame` plus `window.scrollTo`, and a
 * page already over its JS budget does not get to import an easing package for
 * one line of arithmetic.
 */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * What every control in here shares: the hover ink and the focus ring.
 *
 * Factored out because the row below the stage and the pair on it differ only
 * in shape and ground -- and because a route already over its JS budget should
 * not ship the same 120-character class list twice (P14.S9).
 */
const INTERACTIVE =
  "transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none";

/**
 * The stage box, for `useSyncExternalStore` below.
 *
 * The store never changes: the stage is server-rendered and lives as long as
 * the hero does, so there is nothing to subscribe to and the "external system"
 * being read is simply the document. Module scope so the three functions keep
 * one identity for the component's lifetime.
 */
const SUBSCRIBE_NEVER = () => () => {};
const readStage = () => document.querySelector<HTMLElement>("#hero .hero-stage");
const readStageOnServer = () => null;

export function StageSteps({
  next,
  previous,
  nextAria,
  previousAria,
  tour,
  tourStop,
}: {
  /** Visible text of the desktop pair; carries the arrow glyph. */
  next: string;
  previous: string;
  /**
   * The same two actions without the arrow, as a NAME rather than as copy.
   *
   * The arrow is a picture of the direction, and a name is not the place for a
   * picture: a screen reader reads «←» aloud -- "leftwards arrow", or nothing,
   * depending on which one and at what verbosity -- so baking it into the
   * string made the round buttons below announce as "قدم بعدی, leftwards
   * arrow". These strings are what both shapes are NAMED; the arrow stays
   * visible, and stays visible only. */
  nextAria: string;
  previousAria: string;
  /** Accessible name for the auto-play control. */
  tour: string;
  /** ...and for the same control while it is playing, which stops it. */
  tourStop: string;
}) {
  const { trackRef, scrollProgress, holdSnap } = useHeroScroll();
  const reduceMotion = useReducedMotion();
  const [touring, setTouring] = useState(false);
  const frame = useRef(0);
  const tourButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * The stage box, so the mobile pair can be rendered INTO it (P14.S9).
   *
   * A portal rather than a second `StageSteps` instance, and the reason is the
   * tour: `go` has to stop a tour that the button below the stage started, and
   * two instances would have two `touring` states and two `tourCleanup` refs.
   * One component, one teardown -- the invariant the ref above exists to
   * protect -- rendered in two places.
   *
   * `document.querySelector` rather than a ref threaded down from `HeroStage`:
   * the stage is rendered by a Server Component's client child and this is a
   * sibling slot, so there is no shared ref to thread.
   *
   * `useSyncExternalStore` rather than an effect that calls `setState`: the DOM
   * is exactly the "external system" it is for, the server snapshot is `null`
   * so the portal simply does not exist in the server render, and it avoids the
   * cascading render an effect-then-setState costs on a route this size. The
   * snapshot is stable by construction -- `querySelector` hands back the same
   * node object every call -- which is the one thing this hook requires.
   */
  const stage = useSyncExternalStore(SUBSCRIBE_NEVER, readStage, readStageOnServer);

  /**
   * Everything a running tour has to give back, held outside the closure that
   * created it.
   *
   * `startTour` allocates two things that outlive a frame: three window
   * listeners and a `holdSnap` window measured in the whole tour's length. Both
   * used to be released only from inside the gesture handler, which meant the
   * *button* could stop the tour without releasing either -- the listeners
   * stayed attached until some later stray wheel happened to hit them, and soft
   * snapping stayed suppressed for the remaining fifteen seconds of a tour that
   * was no longer playing. Unmounting mid-tour released nothing at all.
   *
   * A ref, so that the button, a gesture and unmount all reach the same
   * teardown: there is exactly one way to end a tour, and it is `stopTour`.
   */
  const tourCleanup = useRef<(() => void) | null>(null);

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

  const stopTour = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    // Idempotent: the ref is cleared as it is spent, so a gesture that lands in
    // the same tick as the button does not remove the listeners twice or
    // re-arm snapping a second time.
    tourCleanup.current?.();
    tourCleanup.current = null;
    setTouring(false);
  }, []);

  useEffect(() => () => stopTour(), [stopTour]);

  const go = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    // A visitor reaching for "next" during a tour is asking for exactly what
    // the tour is doing badly, so the tour yields rather than competing.
    // Without this the smooth scroll below would be overwritten by the tour's
    // own rAF on the very next frame and the press would vanish: `interrupt`
    // never sees a mouse `click` at all, and a tap or a Space would only reach
    // it through events it cannot tell apart from the same gesture aimed at the
    // stop button. Disabling the two buttons for the tour's fifteen seconds was
    // the alternative, and it is worse -- it moves focus mid-animation and
    // takes the control away at the moment it is most wanted.
    //
    // Stopping here rather than in the handler also covers the pointer, the
    // keyboard and the touchscreen with one line. It runs before the `holdSnap`
    // below because ending a tour re-arms snapping, and this scroll needs its
    // own suppression to outlive that.
    stopTour();

    // The RAW scroll position, not the spring. This computes where to scroll
    // TO, and the honest answer to "where am I" for that question is the
    // scrollbar. Reading the smoothed value during a flick would find the stop
    // after where the *drawing* is -- which trails the page -- and could scroll
    // the visitor backwards to reach it.
    const here = scrollProgress.get();
    // A hair of tolerance so pressing "next" while sitting exactly on a stop
    // moves to the following one rather than to the stop you are already at.
    const target =
      direction === 1
        ? stops.find((stop) => stop > here + 0.005)
        : [...stops].reverse().find((stop) => stop < here - 0.005);

    // Past the last stop, "next" leaves the hero rather than refusing: the
    // finale and the page below it are where the visitor is going anyway.
    const fraction = target ?? (direction === 1 ? 1 : CHAPTER_RANGE[1][0]);

    // A slot peak is not a dwell point -- there are nine of these and four of
    // those -- so without this the snapper would wait for the smooth scroll to
    // finish and then drag the visitor off the part they asked for.
    holdSnap(1200);
    window.scrollTo({ top: stationScrollTop(track, fraction), behavior: "smooth" });
  };

  /**
   * Tour mode: the hero playing itself, once (P14.S4).
   *
   * The owner's "it should be able to move from one animation to the next by
   * itself". It is a **scroll**, not a second animation system: each leg eases
   * the window from where it is to the next dwell point, so the spring, the
   * captions, the job card and the camera all follow exactly as they do for a
   * gesture. Nothing in the hero knows the tour exists.
   *
   * ## It never starts on its own, and that is a decision
   *
   * The plan also asked for it to auto-start on mobile if the visitor had not
   * scrolled within 2.5s. **Not built.** A visitor who has not scrolled may
   * simply be reading, and moving their page for them is the definition of
   * scroll-hijacking; it is also a WCAG 2.2.2 hazard, since the motion runs
   * well past five seconds beside other content with no mechanism to stop it
   * before it starts. The button *is* the owner's request -- one-time use,
   * moves from the first animation to the second -- and it is the half that
   * asks first.
   *
   * ## Pausing
   *
   * Any real input -- wheel, touch, key -- cancels it, and it does not resume.
   * A tour that fought its way back after the visitor took the wheel would be
   * the same hijack arriving late. The listeners go on *after* the click that
   * started it: a `<button>` fires its click during the default action of the
   * keydown that activated it, so a keydown listener attached synchronously
   * here would cancel the tour with the very keystroke that asked for it.
   *
   * Every way out of a tour -- the stop button, a gesture, a station button,
   * unmount -- goes through `stopTour`, which is what releases the listeners
   * and hands snapping back. Nothing here tears down anything by itself.
   */
  const startTour = () => {
    const track = trackRef.current;
    if (!track) return;

    // A tour never runs on top of another: `touring` already makes the button
    // stop rather than restart, and `go` stops before it scrolls, so this only
    // ever fires against a tour that has already ended. It is here so that no
    // future caller can strand a cleanup by starting twice.
    stopTour();

    const targets = heroStations().map((station) => station.p);
    let leg = 0;
    let from = window.scrollY;
    let to = stationScrollTop(track, targets[0]!);
    let startedAt = 0;

    const step = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = now - startedAt;

      if (elapsed <= TOUR_LEG_MS) {
        window.scrollTo(0, from + (to - from) * easeInOut(elapsed / TOUR_LEG_MS));
        frame.current = requestAnimationFrame(step);
        return;
      }

      // Arrived. Hold, then take the next leg -- measured fresh, because the
      // page below the hero can reflow while the tour is running and the
      // track's document position is not a constant.
      window.scrollTo(0, to);
      if (elapsed < TOUR_LEG_MS + TOUR_HOLD_MS) {
        frame.current = requestAnimationFrame(step);
        return;
      }

      leg += 1;
      if (leg >= targets.length) {
        stopTour();
        return;
      }
      from = window.scrollY;
      to = stationScrollTop(track, targets[leg]!);
      startedAt = now;
      frame.current = requestAnimationFrame(step);
    };

    /**
     * Any real input cancels -- except an input aimed at the tour button
     * itself.
     *
     * Without that exception the stop button could not be pressed. A tap fires
     * `touchstart` before `click`, and Space fires `keydown` before it: the
     * tour would cancel on the first event and the click would then find
     * `touring` already false and start a second tour. The visitor presses
     * "stop" and it plays again. A `wheel` is exempt from the exception because
     * a wheel over a button is still a scroll -- it moves the page whatever it
     * is pointing at, so the tour has to yield to it.
     *
     * The exemption is the *tour button* and nothing else. It used to cover the
     * whole control row, which silently swallowed a tap or a Space on "next" /
     * "previous" -- those two now stop the tour from `go` regardless, so
     * exempting them bought nothing and hid the press from the one mechanism
     * that was listening for it.
     */
    const interrupt = (event: Event) => {
      if (event.type !== "wheel" && tourButtonRef.current?.contains(event.target as Node)) return;
      stopTour();
    };

    tourCleanup.current = () => {
      holdSnap(0);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("keydown", interrupt);
    };

    setTouring(true);
    // The whole tour is a scripted scroll, so snapping stays off for its
    // duration plus the spring's own settle. Re-armed by `stopTour` on every
    // exit -- including the button, which is the point: a visitor who asked the
    // tour to stop has not asked for fifteen more seconds without snapping.
    holdSnap(targets.length * (TOUR_LEG_MS + TOUR_HOLD_MS) + 2000);
    frame.current = requestAnimationFrame((now) => {
      window.addEventListener("wheel", interrupt, { passive: true });
      window.addEventListener("touchstart", interrupt, { passive: true });
      window.addEventListener("keydown", interrupt);
      step(now);
    });
  };

  if (reduceMotion) return null;

  const control = `inline-flex min-h-12 items-center border border-border px-4 font-mono text-caption text-text-muted ${INTERACTIVE} focus-visible:outline-offset-2`;

  /**
   * The mobile control: 44px, round, on the stage's own ground.
   *
   * `-outline-offset-2` (INSET), like `MobileNav`'s last row and for the same
   * reason: these sit inside a box that is `overflow-x-clip`, so an outward
   * ring on the corner buttons would be drawn into the clipped region and a
   * keyboard visitor would lose the half of it that matters. Inset also keeps
   * the ring inside the circle rather than boxing it.
   *
   * Stage colours, not page colours: unlike the text row below the drawing,
   * these are ON the dark plate at every theme (P14.S2), so `--border` and
   * `--text-muted` would be a light-mode control painted on a dark ground.
   */
  const stageControl = `inline-flex h-tap w-tap items-center justify-center rounded-full border border-stage-border bg-stage text-stage-text-muted ${INTERACTIVE} focus-visible:-outline-offset-2`;

  /**
   * «قدم قبلی» then «قدم بعدی», in the page's reading order.
   *
   * `label` is what is drawn, `name` is what is announced. They differ by the
   * arrow glyph and by nothing else -- which is the one case where overriding
   * a button's visible text with `aria-label` is right rather than a smell:
   * every word a sighted visitor reads is still in the name, so a voice-control
   * visitor saying what they see still hits the button (WCAG 2.5.3). The arrows
   * stay in the copy because they are doing sighted work -- two adjacent
   * text-only buttons in an RTL row, where the arrow says which way the page
   * will move before the words are read, and where the CSS chevrons on the
   * mobile pair were drawn to mirror them (`globals.css`, `.hero-stage-nav`).
   */
  const pair = [
    { direction: -1, label: previous, name: previousAria },
    { direction: 1, label: next, name: nextAria },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-2 motion-reduce:hidden">
      {/* The pair the desktop keeps. Hidden below `lg`, where the portal below
          renders the same two actions in the stage's bottom corners -- only one
          of the two is ever in the document's layout or its accessibility tree,
          so the duplicate names cannot collide. */}
      {pair.map(({ direction, label, name }) => (
        <button
          key={direction}
          type="button"
          onClick={() => go(direction)}
          aria-label={name}
          className={`${control} hidden lg:inline-flex`}
        >
          {label}
        </button>
      ))}
      {stage
        ? createPortal(
            // `dir="rtl"` inside a `dir="ltr"` stage: the buttons are chrome,
            // not canvas coordinates, so «قدم قبلی» takes the start corner the
            // page's own direction gives it -- the right-hand one -- and the
            // drawn chevrons, whose borders are logical, point the way the row
            // already reads. They are the only arrows here: these buttons are
            // named, not labelled, and a name has no room for a picture.
            <div className="hero-stage-nav lg:hidden" dir="rtl">
              {pair.map(({ direction, name }) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => go(direction)}
                  className={stageControl}
                  aria-label={name}
                />
              ))}
            </div>,
            stage,
          )
        : null}
      {/* One button, two states, rather than a play button that becomes inert
          while it plays. A control that starts something it cannot stop is a
          trap for a keyboard visitor, and `disabled` would move focus off it
          the moment it was pressed. */}
      <button
        ref={tourButtonRef}
        type="button"
        onClick={touring ? stopTour : startTour}
        className={`${control} border-brand text-brand`}
      >
        {touring ? tourStop : tour}
      </button>
    </div>
  );
}
