"use client"; // reads scroll progress, which does not exist on the server

import { useEffect, useRef } from "react";
import { useMotionValueEvent, useReducedMotion } from "motion/react";
import { CHAPTER_RANGE, CHAPTER_SEQUENCE, FINALE_BEAT, beatFor, coverOf } from "./heroLayout";
import { stationPlayingAt, type HeroStation } from "./heroStations";

import { calloutSubjectByLayerId } from "./manifestData";
import { useHeroScroll } from "./HeroScrollProvider";

/**
 * The finale's own `data-callout` value.
 *
 * Deliberately not a part id: the finale block is shown by the same mechanism
 * as a plate, and giving it a name no part can have is what keeps "show the
 * caption for X" and "show the finale" one code path instead of two.
 */
const FINALE_ID = "__finale";

/**
 * The scroll invitation, shown only while it is still true.
 *
 * The audit's first finding: the hint "keeps showing even after the last
 * chapter and even after the car has fully re-docked". It is beat 0 now -- on
 * until the first part starts to move, then gone for the rest of the track.
 */
const HINT_ID = "__hint";

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
export function StageNarration({
  stations,
}: {
  /**
   * What to say when the scene reaches each station, already composed and
   * already in Persian digits -- «ایستگاه ۲ · موتور و کاپوت» (P14.S4).
   *
   * Composed on the server and passed in, like `StageSteps`'s button labels:
   * this is a Client Component, and a client-side `useTranslations` would ship
   * the message bundle to a route that is over its JS budget to render four
   * strings that never change.
   */
  readonly stations: Readonly<Record<HeroStation["id"], string>>;
}) {
  const { progress } = useHeroScroll();
  const reduceMotion = useReducedMotion();
  const shown = useRef<string | null>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const announced = useRef<HeroStation["id"] | null>(null);

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

    // Before anything has left the car, the only thing worth saying is how to
    // make it leave.
    if (value < CHAPTER_RANGE[1][0]) return HINT_ID;

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

  /**
   * Say which station the scene has reached -- **only when it changes**.
   *
   * An `aria-live` region on a scroll-linked animation is an accessibility
   * *defect* if it is written on every frame: a screen reader would restart the
   * announcement sixty times a second and say nothing intelligible, and it
   * would do so while the visitor was trying to read something else. So the
   * unit is the station, not the beat and not the part -- four announcements
   * for the whole track, one as each scene opens, and none at all in the gaps
   * between chapters (`stationPlayingAt` returns null there, and null means
   * "say nothing", never "say something else").
   *
   * That is also why the region is not the caption element itself. The plates
   * are shown and hidden by an attribute, ten of them, and browsers disagree
   * about whether a visibility change inside a live region is an update worth
   * announcing. One region whose text is written deliberately is a promise; ten
   * plates toggling `data-shown` is a hope.
   */
  const announce = (value: number) => {
    const station = stationPlayingAt(value);
    if (!station || station.id === announced.current) return;
    announced.current = station.id;
    const node = live.current;
    if (node) node.textContent = stations[station.id];
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

    // The same write also drives the light (P13.S5). Focus dimming, the
    // detached part's drop shadow and the headlight bloom are all "is this the
    // part that is currently out", so they key off one attribute rather than
    // three mechanisms -- and the CSS that reads it lives in globals.css.
    //
    // `data-active` is on the sprite; `data-focus` on the stage is what turns
    // dimming on at all, so a stage with nothing out is not a stage with
    // everything dimmed.
    const stage = root.querySelector<HTMLElement>(".hero-stage");
    for (const sprite of root.querySelectorAll(".hero-stage img[data-active]")) {
      sprite.removeAttribute("data-active");
    }
    if (stage) {
      // `__hint` excluded alongside `__finale` (P14.S3). Both are beats rather
      // than parts, so neither has a sprite -- and the branch below turns
      // dimming ON and then finds nothing to exempt from it, which dropped
      // every layer of the car to `saturate(.5) brightness(.62)` with no
      // subject to look at. That is the exact state the comment above says
      // cannot happen. It was latent while beat 0 was invisible until the
      // first scroll event; fixing that (see the mount effect below) put a
      // dimmed car on the first frame, which is how it surfaced.
      if (id && id !== FINALE_ID && id !== HINT_ID) {
        stage.dataset.focus = "";
        for (const sprite of root.querySelectorAll(
          `.hero-stage img[data-part="${CSS.escape(id)}"]`,
        )) {
          sprite.setAttribute("data-active", "");
        }
      } else {
        // At the finale every part is the subject, so dimming all but one would
        // be dimming the catalogue. At beat 0 nothing has left the car yet.
        delete stage.dataset.focus;
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
    // Otherwise: state the CURRENT beat rather than waiting for the first
    // scroll event (P14.S3).
    //
    // `useMotionValueEvent` only fires on change, so nothing was shown until
    // the visitor scrolled -- which meant the beat-0 caption was blank on the
    // one frame everybody sees, the one at scrollY=0. It was invisible from
    // the day the hint shipped and cost nothing while the hint was the only
    // thing in the slot: `visibility: hidden` still reserved its line, so the
    // page looked intact. P14.S3 moves the hero's value proposition into that
    // slot, which makes the missing first frame the whole step's subject.
    //
    // `progress.get()` rather than 0: a reload restores the scroll position
    // before this mounts, so a visitor returning to mid-track must get the
    // caption for where they actually are.
    else {
      show(subjectAt(progress.get()));
      // Seeded, deliberately SILENT. Writing the current station here would
      // announce it on load -- and on a reload restored to mid-track, the first
      // thing the visitor would hear is a caption for a scene they did not ask
      // to be told about. Recording it without saying it means the next real
      // change is the first thing spoken.
      announced.current = stationPlayingAt(progress.get())?.id ?? null;
    }
    return () => show(null);
    // `show` and `subjectAt` are re-created every render and close over
    // nothing that changes; `progress` is the provider's motion value, stable
    // for the hero's lifetime. Listing them would re-run the effect on every
    // render to write the attribute it just wrote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  useMotionValueEvent(progress, "change", (value) => {
    if (reduceMotion) return;
    show(subjectAt(value));
    announce(value);
  });

  // `sr-only` is out of flow (`position: absolute`), so this renders no box and
  // the hero column's `order-*` utilities are unaffected -- the same reason
  // `StationOutline` needs no order of its own.
  return <p ref={live} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />;
}
