// No 'use client': this renders one inline <script> tag and nothing else. The
// script is a *string* to the server and to React -- the browser executes it
// during parse, long before any bundle for this route has been fetched. Making
// it a Client Component would ship the same bytes twice and would not make it
// run any earlier.

/**
 * Arms the enter-on-view reveals (`components/motion/Reveal.tsx`, §P14.S7).
 *
 * ## Why an inline script and not a stylesheet default
 *
 * `Reveal` hides a block, then an IntersectionObserver brings it back. The
 * observer exists only after the route's JavaScript has downloaded, parsed and
 * hydrated successfully. So "hidden by default in CSS" means: *any* failure
 * between first paint and hydration -- a chunk 404, a throw from an unrelated
 * component, an extension that eats part of the bundle -- leaves the entire
 * landing page below the hero permanently at `opacity: 0`. There is no error
 * boundary that can reach a CSS opacity, and no timeout in a React effect can
 * help, because the effect is the thing that did not run.
 *
 * The repo already had the rule written down. `ManifestCheckIn`: *"It only ever
 * hides rows that it can bring back. The server renders every row checked in,
 * and this component opts into the choreography... Writing it the other way
 * round would mean a no-JS visitor gets an empty panel."* This is that rule,
 * applied to everything else on the page.
 *
 * So the server sends the page **visible**, and JavaScript asks for the hidden
 * pre-reveal state by setting `data-reveal-armed` on `<html>`. Every hiding
 * rule in `globals.css` is gated on that attribute. If this script never runs,
 * nothing is ever hidden and the page simply stands.
 *
 * ## Why it is blocking and inline, not a mount effect
 *
 * Same reason `PartsManifest`'s `PRE_PAINT` is: arming from a `useEffect` would
 * paint the sections, then hide them, then walk them back in on scroll. A flash
 * on load is what `masterPlan.md` §6.7 forbids, and it is also what made the
 * page-level axe sweep fail once already, because axe sampled half-transparent
 * text mid-fade and scored the blended colour. Rendered before any
 * `[data-reveal]` element in the document, this runs before those elements are
 * even parsed, so their first paint is already the armed one. Nothing above the
 * fold can flash, because nothing above the fold is ever painted twice.
 *
 * ## The watchdog
 *
 * Arming creates the exact failure this component exists to prevent -- a page
 * hidden by a script whose rescuer may never arrive. So the same script that
 * arms also sets the deadline, in the same closure, with no dependency on React
 * running at all. `Reveal`'s effect upgrades the attribute to `live` when the
 * observer is actually attached; if that has not happened by the deadline, the
 * script removes the attribute itself and the page becomes visible with no
 * transition. The reveal is a nicety; the content is the product.
 *
 * A React effect could not do this job: in every scenario worth defending
 * against, React effects are precisely what did not run.
 */

/** Present on `<html>` => the pre-reveal hidden state applies. */
export const REVEAL_ARMED_ATTR = "data-reveal-armed";

/**
 * The value `Reveal` writes once its observer is attached. Any other value --
 * including the empty string this script arms with -- means "not yet".
 */
export const REVEAL_ARMED_LIVE = "live";

/**
 * How long the page may stay hidden waiting for hydration.
 *
 * 2000ms, chosen to match the route's own LCP budget (`masterPlan.md` §10, and
 * the 2.0s target `docs/performance-landing.md` measures `/` against). The
 * principle: content must not be invisible for longer than the time we allow it
 * to first appear in. A budget the route already has to hold is a better number
 * than one invented here.
 *
 * Why the top of the sane range and not 1500ms: `docs/performance-landing.md`
 * measured 3379ms of total main-thread work for this route under 4x CPU
 * throttle. This timer is itself queued on that same main thread, so a busy
 * hydration delays the watchdog as much as it delays the signal -- the two
 * race, rather than the watchdog running against a wall clock while hydration
 * stalls. 2000ms keeps a healthy-but-slow device from losing its animation to a
 * false alarm. If it does fire early the cost is one lost animation, not lost
 * content, which is the direction this whole change points.
 */
export const REVEAL_WATCHDOG_MS = 2000;

/**
 * Runs during parse. Deliberately unreadable-compact, like `PRE_PAINT`: it goes
 * into the document on every shop page and is never debugged in this form.
 *
 * It reads the reduced-motion preference itself and returns without arming, so
 * that visitor's page is never hidden for even one frame and never has a
 * transition to see. The `@media (prefers-reduced-motion: reduce)` block in
 * `globals.css` stays as the live backstop for a preference changed after load,
 * and for a browser with no `matchMedia`.
 */
const ARM = `(function(){var r=document.documentElement;
if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
r.setAttribute("${REVEAL_ARMED_ATTR}","");
setTimeout(function(){
if(r.getAttribute("${REVEAL_ARMED_ATTR}")!=="${REVEAL_ARMED_LIVE}")r.removeAttribute("${REVEAL_ARMED_ATTR}");
},${REVEAL_WATCHDOG_MS});})()`;

/**
 * Render once per document, before any `[data-reveal]` element. It lives at the
 * top of the `(shop)` layout for that reason: every route that uses `Reveal`
 * is inside it, and nothing there renders content ahead of it.
 *
 * Rendering it late, or not at all, degrades in the safe direction -- the
 * sections are simply visible from the start.
 */
export function RevealBoot() {
  return <script dangerouslySetInnerHTML={{ __html: ARM }} />;
}
