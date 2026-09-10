/**
 * The branded loading mark — **THE HIGGSFIELD SEAM** (P15.S3).
 *
 * ## Read this before changing anything here
 *
 * `tasks.md` §"Phase 15 → Owner decisions" settles that the site's real loading
 * animation will be generated with HiggsField as launch prep, and that S3 must
 * leave **one component and one token set** so the swap is a one-file change.
 * This is that component. The token set is the `--loader-*` block in
 * `styles/tokens.css`; the CSS that draws the mark is `.workshop-loader*` in
 * `styles/globals.css`, immediately beside it.
 *
 * The contract this file has to keep when the real animation lands:
 *
 * - **Server Component, zero client JavaScript.** It is meant to render inside
 *   a Suspense fallback shared by the shop routes, and the landing has 0.2 kB
 *   of first-load budget left (`pnpm check:budget`), so a client leaf here is
 *   not affordable. A generated animation must arrive as CSS, an inline SVG or
 *   a video element — not as a runtime.
 * - **`aria-hidden`, always.** The mark says nothing a screen reader needs; the
 *   sentence beside it does, and it carries the `role="status"`. Two things
 *   announcing one wait is one thing too many.
 * - **`prefers-reduced-motion` is honoured in CSS, not in a branch.** There is
 *   no `useReducedMotion()` available in a Server Component, and a JS branch
 *   would render the moving version first and correct it afterwards.
 * - **No fixed size, no colour of its own.** It fills its column and takes
 *   `--loader-ink` / `--loader-track`, so it works on the page surface it is on
 *   today and on whatever surface it is dropped onto next.
 *
 * ## Why three rules and not a spinner
 *
 * A spinner says "a computer is busy". Every other surface on this site says
 * "someone at a counter is doing something for you" (`docs/voice.md`), and the
 * design direction is ADR 0025's Workshop Docket. Three rules of a job card
 * being filled in — one long, one shorter, one stub — is that sentence in the
 * language the rest of the page already speaks, and it costs one CSS animation.
 */
export function WorkshopLoader() {
  return (
    <div className="workshop-loader" aria-hidden="true">
      <span className="workshop-loader-rule" />
      <span className="workshop-loader-rule" />
      <span className="workshop-loader-rule" />
    </div>
  );
}
