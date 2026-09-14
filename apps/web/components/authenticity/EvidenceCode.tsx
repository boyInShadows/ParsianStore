/**
 * A verification code, stamped (P12.S10, recording defect 4).
 *
 * Seeded codes look like `VER-SKU-ENGINE-CYLINDER-HEAD-GASKET-PRIDE-111` --
 * 36 to 45 characters. Rendered as ordinary text inside Persian copy that is
 * three problems at once:
 *
 * 1. **It wraps.** A 45-character token in a narrow column breaks across two or
 *    three lines and stops reading as one identifier.
 * 2. **It reorders.** A Latin token in an RTL paragraph is laid out by the bidi
 *    algorithm, and a code ending in digits (`...PRIDE-111`) can have that run
 *    repositioned relative to the rest. Every character is still present and in
 *    the wrong visual order, which is the worst kind of wrong for something a
 *    person is asked to compare against a hologram.
 * 3. **It jitters.** Proportional digits make two codes of the same length
 *    different widths, so a column of them will not align.
 *
 * So: `dir="ltr"` with `unicode-bidi: isolate` -- the isolate matters, because
 * `dir` alone still lets the surrounding paragraph's direction decide where the
 * run is *placed* -- one line, tabular mono, ellipsis when it does not fit.
 *
 * ## Two classes, and why this component is the only holder of the second
 *
 * `bidi-code` is the primitive: isolation and tabular figures, shared with the
 * three places that stamp a SHORT identifier (`SYS-10`, a model year, the hero
 * callout's part code). `evidence-code` is the truncation contract on top of
 * it, and belongs to a 36-45 character token alone -- it was one class doing
 * both jobs until P15.S5, which is why P14.S9 had to move `tabular-nums` down
 * into the shared half to reach call sites that never wanted the other half.
 * Neither class is written by hand anywhere else;
 * `EvidenceCode.contract.test.tsx` fails the build if one is. The utilities that used to spell the
 * truncation out here (`inline-block max-w-full truncate align-bottom`, plus a
 * `tabular-nums` the class already carried) are now declarations in
 * `styles/globals.css`, where the contract they implement is stated.
 *
 * **The full code is never removed from the document**, only visually clipped
 * by `text-overflow`. A screen reader reads the whole thing, selecting it
 * copies the whole thing, and `title` shows it on hover. Truncating a
 * verification code in the DOM would defeat the one thing it is for.
 *
 * No copy button: this renders inside an `<a>` on the landing page, where a
 * nested button is invalid, and adding one would mean client JavaScript on a
 * route already over its budget. Selection and `title` cover it.
 */
export function EvidenceCode({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span dir="ltr" title={code} className={`bidi-code evidence-code font-mono ${className}`}>
      {code}
    </span>
  );
}
