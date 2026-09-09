"use client"; // reads the garage store, whose storage is document.cookie -- browser-only by construction

import { selectActiveVehicle, useGarageStore } from "@/stores/garage-store";

type Props = {
  /** The line every visitor gets. This is what the server renders and what
   *  ships in the HTML, so it is also the line a visitor with no saved car,
   *  no JavaScript, or a crawler reads. */
  generic: string;
  /** The same lead with the visitor's car named. Passed as a raw template
   *  (`t.raw`) rather than formatted upstream, because the only place the
   *  label exists is the browser -- see the note below on why it is not read
   *  on the server. Its `{car}` slot is asserted by SavedCarLead.test.tsx: a
   *  template that lost the slot would render a sentence about a car it never
   *  names, and nothing else on the page would notice. */
  personalized: string;
};

/**
 * The `#find-my-part` lead, which names the visitor's car when there is one
 * (P15.S4).
 *
 * ## Why this is a client leaf and not a server read of the cookie
 *
 * `ps_garage` is a plain, deliberately non-httpOnly cookie (`lib/cookie.ts`,
 * masterPlan §3.4), so `cookies()` *could* read it in the Server Component
 * above. It is not used, and that is the whole point of the step: touching
 * `cookies()` opts the route out of static generation, so every visitor gets a
 * server render, TTFB rises and the CDN can no longer cache the page. That is a
 * large architectural cost for one sentence of copy. (PPR would be the escape
 * hatch and is not available: `experimental.ppr` needs Next's canary channel
 * and this repo is on 15.5.21 stable.)
 *
 * ## Why this cannot cause a hydration mismatch
 *
 * zustand v5's `persist` overrides `api.getInitialState()` to return the
 * pre-rehydration state, and `useStore` passes that as `useSyncExternalStore`'s
 * *getServerSnapshot* -- which React uses for the SSR render **and** for the
 * hydration render. Both therefore see an empty garage and emit `generic`; the
 * store's real value only reaches the DOM on the re-render after hydration
 * commits. Same mechanism the Header's vehicle chip has always relied on
 * (`components/layout/Header.tsx`), and the same reason `theme-toggle.tsx`
 * reaches for `useSyncExternalStore` rather than `useEffect(() => setState)`.
 *
 * ## Why the swap cannot cost CLS
 *
 * `#find-my-part` sits entirely below the fold at every breakpoint (the hero
 * alone is 2,539px on a phone, 3,773px at 1440) and carries
 * `content-visibility: auto` from P15.S2, so at the moment this text changes
 * the section has not been laid out, let alone painted. A shift outside the
 * viewport is not a layout shift. This is why the lead is here and not on the
 * hero's subheadline, which sits in the LCP region: P15.S3c measured that a
 * change to text metrics there rewraps the heading and moves the page 177px.
 */
export function SavedCarLead({ generic, personalized }: Props) {
  const activeVehicle = useGarageStore(selectActiveVehicle);
  return (
    <p className="max-w-2xl text-body text-text-muted">
      {activeVehicle ? personalized.replace("{car}", activeVehicle.label) : generic}
    </p>
  );
}
