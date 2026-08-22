import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
import { VehicleSelectorLazy } from "@/components/garage";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { HeroStage } from "./HeroStage";
import { PartCodeSearch } from "./PartCodeSearch";

/**
 * Every catalog system, as a ruled index beside the diagram.
 *
 * This is where the hero earns the removal of the standalone Shop-by-system
 * grid (P9.S9): only four of the nine part renders depict a system honestly
 * (see heroLayout.ts), so the diagram alone cannot carry ten destinations. The
 * index does, with each system's mono code and its real product count.
 */
async function SystemIndex({ linkLabel }: { linkLabel: (name: string) => string }) {
  const t = await getTranslations("Landing.beats.hero");
  const counts = await getSystemPartCounts();

  return (
    <>
      {/* The standalone Shop-by-system grid was deleted at P9.S9 because this
          rail already covers its destinations one for one. Its heading survives
          as a landmark so the page does not lose the section's semantics along
          with its markup -- visually redundant next to the diagram's own lead
          line, so it is sr-only rather than repeated on screen. */}
      <h2 id="shop-by-system-heading" className="sr-only">
        {t("systemIndexTitle")}
      </h2>
      <ul
        aria-labelledby="shop-by-system-heading"
        className="grid grid-cols-1 border-t border-graphite-800 sm:grid-cols-2"
      >
        {CATALOG_SYSTEMS.map((system) => {
          const count = counts[system.code];
          return (
            <li key={system.code} className="border-b border-graphite-800">
              <a
                href={`/c/${system.slug}`}
                aria-label={linkLabel(system.name.fa)}
                className="flex min-h-12 items-center justify-between gap-3 py-3 text-graphite-100 transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-data text-graphite-400">{system.code}</span>
                  <span className="text-body-sm">{system.name.fa}</span>
                </span>
                {count !== null ? (
                  <span className="font-mono text-caption text-graphite-400">
                    {t("partsCount", { count })}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Hero v2 — the Exploded View in a new costume (fableTasks D4).
 *
 * The signature stays the signature: one vehicle drawn apart, every system
 * reachable from it, the two entry paths inside the composition rather than
 * stacked below it. What changes is the artwork (rendered cutouts instead of
 * flat SVG) and the trigger (scroll instead of page load), plus the Mechanic's
 * code field the audit asked for.
 *
 * Server component: only the scroll stage and the code field are client work,
 * and both are leaves.
 */
export async function HeroV2() {
  const t = await getTranslations("Landing.beats.hero");

  return (
    <section id="hero" className="overflow-x-clip bg-graphite-950 text-graphite-50">
      {/* The no-JS half of the pair described in globals.css: without it the
          stage's collapsed first frame would be the only frame. `noscript`
          takes raw HTML rather than children so React cannot escape the CSS. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.hero-stage > *{transform:none!important;opacity:1!important}" +
            ".hero-track{min-height:0!important}.hero-pin{position:static!important}</style>",
        }}
      />
      <div className="mx-auto grid max-w-container gap-8 border-x border-graphite-800 px-4 py-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-cta" />
            <p className="font-mono text-data text-graphite-300">{t("code")}</p>
          </div>

          <div>
            <h1 className="font-display text-display-1 font-black text-graphite-0">
              {t("headline")}
            </h1>
            <p className="mt-4 text-body-lg text-graphite-200">{t("subheadline")}</p>
          </div>

          {/* Anchor target for the closing beat's CTA -- «از خودروت شروع کن»
              returns here, because naming a car is where every route into the
              catalogue on this page begins. `scroll-mt` clears the sticky
              header so the heading is not hidden under it on arrival. */}
          <div
            id="driver-path"
            className="flex scroll-mt-24 flex-col gap-3 border-t border-graphite-800 pt-6"
          >
            <h2 className="text-body font-bold text-graphite-0">{t("driverPath.title")}</h2>
            <p className="text-body-sm text-graphite-300">{t("driverPath.hint")}</p>
            <div className="border border-graphite-700 bg-graphite-900 p-4">
              <VehicleSelectorLazy />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-graphite-800 pt-6">
            <h2 className="text-body font-bold text-graphite-0">{t("mechanicPath.title")}</h2>
            <PartCodeSearch
              label={t("mechanicPath.codeLabel")}
              placeholder={t("mechanicPath.codePlaceholder")}
              hint={t("mechanicPath.codeHint")}
              submit={t("mechanicPath.codeSubmit")}
              emptyError={t("mechanicPath.codeEmptyError")}
            />
          </div>

          <div className="flex items-center gap-3 font-mono text-caption text-graphite-400">
            <span>SAIPA</span>
            <span className="h-px w-6 bg-graphite-700" />
            <span>IRAN KHODRO</span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <p className="max-w-prose text-body text-graphite-200">{t("diagramLead")}</p>
          <HeroStage
            label={t("diagramLabel")}
            carAlt={t("staticStateAlt")}
            hint={t("scrollHint")}
          />
          <SystemIndex linkLabel={(name) => t("systemLinkLabel", { name })} />
        </div>
      </div>
    </section>
  );
}
