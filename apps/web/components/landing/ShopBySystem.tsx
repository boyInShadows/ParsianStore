import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS } from "schemas";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 03: "Reuses the Exploded View components as a
// grid, each carrying its SYS-xx code." Same CATALOG_SYSTEMS + same real
// part-count fetcher as the hero's ExplodedView (P4.S2) -- a grid
// treatment instead of the SVG assembly, since the assembly itself is
// the hero's one orchestrated load sequence, not something repeated here.
export async function ShopBySystem() {
  const t = await getTranslations("Landing");
  const counts = await getSystemPartCounts();

  return (
    <section
      id="shop-by-system"
      aria-labelledby="shop-by-system-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("sections.shopBySystem.code")}</p>
        <h2 id="shop-by-system-heading" className="font-display text-h2 font-black text-text">
          {t("sections.shopBySystem.title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("sections.shopBySystem.subtitle")}</p>
      </Reveal>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CATALOG_SYSTEMS.map((system) => {
          const count = counts[system.code];
          return (
            <li key={system.code}>
              <a
                href={`/c/${system.slug}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand motion-reduce:transition-none"
              >
                <span className="font-mono text-data text-text-muted">{system.code}</span>
                <span className="font-medium text-text">{system.name.fa}</span>
                {count !== null ? (
                  <span className="mt-auto text-body-sm text-text-muted">
                    {t("partsCount", { count })}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
