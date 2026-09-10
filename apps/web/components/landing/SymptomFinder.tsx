import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, toPersianDigits } from "schemas";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 09: 10 real symptom phrases (one per real
// CATALOG_SYSTEMS entry, paired by array index -- see messages/fa.json's
// authored copy) linking straight to that system's real category. Not a
// diagnostic tool -- a fast, honest shortcut into the right shelf, per
// the "cheap to build, disproportionately useful" note in the spec.
//
// P9.S12: the visible SYS-xx code is gone from each card. With it, this
// section read as a second copy of the hero's system index -- the same ten
// destinations, the same mono codes, only the labels differed -- which is the
// duplication audit item 4 was about (found at S9, recorded in tasks.md).
// Without it the card is what it is meant to be: the Driver describing a
// symptom, not the Mechanic reading an index. Destinations are unchanged, so
// this is a one-line reversal if the owner prefers the code visible.
/** How many chips a phone shows before the expander. */
const VISIBLE_ON_MOBILE = 6;

export async function SymptomFinder() {
  const t = await getTranslations("Landing.beats.symptomFinder");
  const items = t.raw("items") as string[];

  return (
    <section
      id="symptom-finder"
      aria-labelledby="symptom-finder-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="symptom-finder-heading" className="font-display text-h2 font-bold text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      {/* Two columns and a «بیشتر» expander on a phone, all ten from `sm`
          (P14.S6 item 7). Ten sentence-length chips in one column is 600px of
          symptom list; six is a glance.

          One <ul>, and the four extra chips are `<li>`s inside it that CSS
          hides -- not a second list. Splitting them would tell a screen reader
          there are two unrelated groups of symptoms, which is a lie told to
          make a selector easier to write. The toggle is a checkbox for the
          same reason `Disclosure` is one: the breakpoint has to be able to
          override it, and no JavaScript ships for this. */}
      <Reveal as="ul" stagger className="symptom-list mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {CATALOG_SYSTEMS.map((system, index) => (
          <li key={system.code} className={index >= VISIBLE_ON_MOBILE ? "symptom-extra" : ""}>
            <a
              href={`/c/${system.slug}`}
              className="flex h-full min-h-12 items-center gap-3 rounded-lg border border-border bg-surface p-3 text-body-sm text-text transition-colors hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              <span>{items[index]}</span>
            </a>
          </li>
        ))}
      </Reveal>
      {/* Input immediately before its own label -- `Disclosure`'s rule, and
          here that puts both AFTER the list they control, because that is
          where the toggle is on screen.

          The first cut put the checkbox first in the section instead, so the
          first Tab into the section landed on a visually-hidden control whose
          focus ring appeared at the BOTTOM of the section, past all six chips,
          and a screen reader announced «۴ علامت دیگر، checkbox» before a word
          about the symptoms it modifies (WCAG 2.4.3 Focus Order).

          The price is that the chips are now the checkbox's PRECEDING
          siblings, out of `~`'s reach -- hence the `:has()` rule in
          globals.css. DOM order, visual order and focus order all agree, which
          is the thing worth paying for.

          `sm:hidden` and not just `sr-only`: an `sr-only` checkbox is still a
          tab stop, and above `sm` this one controls nothing -- every chip is
          already visible and its label is gone. */}
      <input type="checkbox" id="symptom-more" className="symptom-more peer sr-only sm:hidden" />
      <label
        htmlFor="symptom-more"
        className="symptom-more-label mt-3 flex min-h-tap cursor-pointer items-center justify-center gap-2 border border-border text-body-sm text-text-muted hover:border-brand hover:text-text peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
      >
        <span className="symptom-more-open">
          {t("more", { count: toPersianDigits(CATALOG_SYSTEMS.length - VISIBLE_ON_MOBILE) })}
        </span>
        <span className="symptom-more-close">{t("less")}</span>
      </label>
    </section>
  );
}
