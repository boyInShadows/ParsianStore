"use client";

// 'use client': the loop must be paused until the section is on screen, and
// "is it on screen" is an IntersectionObserver reading a viewport the server
// does not have. Everything else here -- the two runs, the separators, the
// reduced-motion layout -- is markup and CSS; the items themselves arrive
// already rendered by the server.

import { Fragment, useEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  /**
   * One entry per real item. An array rather than `children`, because the
   * component has to interleave separators and then emit the whole run a
   * second time -- neither of which it can do to an opaque `ReactNode`.
   */
  items: ReactNode[];
  /**
   * Rendered between items *and* after the last one, so the rhythm across the
   * seam matches the rhythm inside a run. Optional: without it the separator
   * slot is an empty box that still carries the spacing.
   */
  separator?: ReactNode;
  /**
   * Accessible name for the scrolling region. Without one the track is an
   * unlabelled run of links: the section heading names the *section*, not the
   * group inside it, and the duplicate run is `inert` + `aria-hidden`, so what
   * a screen reader reaches is a bare list.
   */
  label?: string;
  className?: string;
};

/**
 * Continuous horizontal loop (brand wall, masterPlan.md §5 section 05).
 *
 * ## The seam, and why the old shape had one
 *
 * The previous version rendered the fifteen item nodes directly into the track
 * and then wrapped the duplicate in a single extra `<div>`. The track's direct
 * children were therefore 15 nodes plus 1 wrapper, and each item carried its
 * own leading separator -- so the last name of a run and the first name of the
 * next had nothing between them. The `◆` rhythm broke once per lap at exactly
 * the point that is supposed to be invisible, and the owner read the result as
 * "not infinite".
 *
 * Now the track has exactly two children, both `Run`, both built by the same
 * function from the same array; the only difference is that the second is
 * `aria-hidden` + `inert`. `inert` and not merely `aria-hidden`, because these
 * items are links: `aria-hidden` hides them from assistive tech but does not
 * stop Tab reaching them, which is axe's `aria-hidden-focus` rule and a
 * sighted keyboard user tabbing into invisible duplicates.
 *
 * Spacing lives on the separator as logical margin rather than on a `gap`.
 * A `gap` on the track sits between the two runs as well, which makes the
 * track `2 x run + gap` wide while the animation translates by exactly half of
 * it -- half a gap of drift per lap, which is a visible seam.
 *
 * Direction, duration, pausing and the reduced-motion layout are all in
 * globals.css under `.motion-marquee-*`; the component's only job at runtime
 * is to say whether the section is on screen.
 */
export function Marquee({ items, separator, label, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // The attribute is written straight onto the node rather than held in
    // React state. Two reasons, and both matter on this route: a `useState`
    // here means a re-render every time the band crosses the fold, and setting
    // state synchronously inside an effect is a cascading render that
    // `react-hooks/set-state-in-effect` rejects outright. Nothing React renders
    // depends on this value -- only a CSS selector does.
    const setInView = (value: boolean) => {
      element.setAttribute("data-inview", value ? "true" : "false");
    };

    // Without IntersectionObserver the honest fallback is a running loop, not
    // a permanently frozen one: the animation is the content here.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      // No margin and no threshold: the loop should be running by the time the
      // first pixel of the band is visible, and stopped the moment the last
      // one leaves. Unlike Reveal this one is not `once` -- an off-screen
      // marquee is wasted compositing for the whole rest of the page.
      { threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`motion-marquee overflow-hidden ${className}`}
      data-inview="false"
      {...(label ? { role: "group", "aria-label": label } : {})}
    >
      <div
        className="motion-marquee-track flex w-max"
        // A unitless count, not a duration: globals.css multiplies it by
        // `--marquee-item-duration` (3.5s per item, tokens.css) so a longer
        // brand list runs proportionally longer rather than faster.
        style={{ "--marquee-items": items.length } as React.CSSProperties}
      >
        <Run items={items} separator={separator} />
        <Run items={items} separator={separator} clone />
      </div>
    </div>
  );
}

function Run({
  items,
  separator,
  clone = false,
}: {
  items: ReactNode[];
  separator?: ReactNode;
  clone?: boolean;
}) {
  return (
    <div
      className="motion-marquee-run flex w-max shrink-0 items-center"
      {...(clone ? { "data-clone": "", "aria-hidden": true, inert: true } : {})}
    >
      {items.map((item, index) => (
        // Index keys: this is the same array rendered twice in a fixed order,
        // and the items carry their own keys from the caller's map.
        <Fragment key={index}>
          {item}
          <span
            aria-hidden="true"
            // Punctuation for the eye -- a screen reader walking fifteen brand
            // links does not need a diamond announced fifteen times. Logical
            // margins, and the trailing one on the last separator is what
            // makes the seam spacing equal to every other gap in the run.
            className="motion-marquee-sep me-8 ms-8"
          >
            {separator}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
