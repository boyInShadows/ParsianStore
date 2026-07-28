import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { fetchVehicleTreeSafe } from "@/lib/fetchers/vehicles";
import { CountUp, Reveal } from "@/components/motion";

// masterPlan.md §5 item 10 specs four numbers: parts in stock, vehicles
// covered, orders shipped, years in business. Same honesty constraint as
// section 04 (best sellers): "orders shipped" has no real source at all
// (no Cart/Order until Phase 5+, so it's genuinely always 0, not just
// unknown) and "years in business" isn't data this codebase has anywhere
// -- fabricating either would be exactly the "no fabricated data" rule
// this section's own sibling (section 04) already got an explicit
// owner decision about. Showing only the two numbers that ARE real
// (summed from the live catalog/vehicle APIs, not hardcoded) rather than
// padding the section with invented ones.
export async function Numbers() {
  const t = await getTranslations("Landing.sections.numbers");
  const counts = await getSystemPartCounts();
  const partsInStock = CATALOG_SYSTEMS.reduce((sum, s) => sum + (counts[s.code] ?? 0), 0);

  const tree = await fetchVehicleTreeSafe();
  const modelsCovered = tree.reduce((sum, entry) => sum + entry.models.length, 0);

  return (
    <section
      id="numbers"
      aria-labelledby="numbers-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="numbers-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
      </Reveal>
      <Reveal className="mt-6 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <CountUp
            value={partsInStock}
            className="font-display text-display-2 font-black text-text"
          />
          <span className="text-body-sm text-text-muted">{t("partsInStock")}</span>
        </div>
        <div className="flex flex-col gap-1">
          <CountUp
            value={modelsCovered}
            className="font-display text-display-2 font-black text-text"
          />
          <span className="text-body-sm text-text-muted">{t("modelsCovered")}</span>
        </div>
      </Reveal>
    </section>
  );
}
