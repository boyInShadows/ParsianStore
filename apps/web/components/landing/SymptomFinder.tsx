import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 09: 10 real symptom phrases (one per real
// CATALOG_SYSTEMS entry, paired by array index -- see messages/fa.json's
// authored copy) linking straight to that system's real category. Not a
// diagnostic tool -- a fast, honest shortcut into the right shelf, per
// the "cheap to build, disproportionately useful" note in the spec.
export async function SymptomFinder() {
  const t = await getTranslations("Landing.sections.symptomFinder");
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
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-body-sm text-text transition-colors hover:border-brand motion-reduce:transition-none"
            >
              <span>{items[index]}</span>
              <span className="font-mono text-caption text-text-muted">{system.code}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
