import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { VehicleSelectorLazy } from "@/components/garage";
import { ExplodedView, type NodeLabels } from "./ExplodedView";

// The Exploded View (P4.S2) is the page's one orchestrated load sequence
// -- it deliberately does NOT use the Reveal scroll-in wrapper every
// other section uses (masterPlan.md §5 motion budget).
export async function Hero() {
  const t = await getTranslations("Landing");
  const counts = await getSystemPartCounts();

  // Translated server-side and passed down as plain strings, not looked
  // up via next-intl's client `useTranslations()` hook inside
  // ExplodedView itself -- that hook alone pulled next-intl's client
  // runtime into the bundle and pushed the landing route from 180KB to
  // 192KB, over the P4.S3-established budget ceiling. Server-side lookup
  // + plain-string props gets the same rule-7 compliance (no hardcoded
  // strings outside locale files) for free, with zero client JS cost.
  const nodeLabels = Object.fromEntries(
    CATALOG_SYSTEMS.map((system) => {
      const count = counts[system.code];
      return [
        system.code,
        {
          partsCountLabel: count !== null ? t("partsCount", { count }) : null,
          linkLabel: t("explodedView.systemLinkLabel", { name: system.name.fa }),
        },
      ];
    }),
  ) as NodeLabels;

  return (
    <section id="hero" className="mx-auto flex max-w-container flex-col gap-8 px-4 py-16">
      <div>
        <p className="font-mono text-data text-text-muted">{t("sections.hero.code")}</p>
        <h1 className="font-display text-display-1 font-black text-text">
          {t("sections.hero.headline")}
        </h1>
        <p className="mt-2 max-w-2xl text-body-lg text-text-muted">
          {t("sections.hero.subheadline")}
        </p>
      </div>
      {/* masterPlan.md §5 item 01: "Vehicle selector ... sits inside the
          composition, not below it" -- same section/card as the Exploded
          View, not a separate landing section. */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <VehicleSelectorLazy />
      </div>
      <ExplodedView svgLabel={t("explodedView.svgLabel")} nodeLabels={nodeLabels} />
    </section>
  );
}
