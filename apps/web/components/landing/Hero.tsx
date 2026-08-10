import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
import { VehicleSelectorLazy } from "@/components/garage";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { ExplodedView, type NodeLabels } from "./ExplodedView";

export async function Hero() {
  const t = await getTranslations("Landing");
  const counts = await getSystemPartCounts();
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
    <section id="hero" className="overflow-hidden bg-graphite-950 text-graphite-50">
      <div className="relative mx-auto min-h-screen max-w-container border-x border-graphite-800">
        <Image
          src="/brand/exploded-brake-hero.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1440px) 1440px, 100vw"
          className="object-cover object-center opacity-70 lg:object-left"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="relative z-10 flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-4 py-16 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-marigold-400" />
            <p className="font-mono text-data text-graphite-300">{t("sections.hero.code")}</p>
          </div>
          <div>
            <h1 className="max-w-3xl font-display text-display-1 font-black text-graphite-0">
              {t("sections.hero.headline")}
            </h1>
            <p className="mt-4 max-w-2xl text-body-lg text-graphite-200">
              {t("sections.hero.subheadline")}
            </p>
          </div>
          <div className="max-w-2xl border border-graphite-700 bg-graphite-900 p-4 shadow-lg">
            <VehicleSelectorLazy />
          </div>
          <div className="flex items-center gap-3 font-mono text-caption text-graphite-400">
            <span>SAIPA</span>
            <span className="h-px w-6 bg-graphite-700" />
            <span>IRAN KHODRO</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-container border-x border-t border-graphite-800 bg-graphite-900 px-4 py-8 lg:px-8">
        <ExplodedView svgLabel={t("explodedView.svgLabel")} nodeLabels={nodeLabels} />
      </div>
    </section>
  );
}
