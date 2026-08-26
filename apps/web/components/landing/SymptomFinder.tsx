import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
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
        <h2 id="symptom-finder-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG_SYSTEMS.map((system, index) => (
          <li key={system.code}>
            <a
              href={`/c/${system.slug}`}
              className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-surface p-3 text-body-sm text-text transition-colors hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              <span>{items[index]}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
